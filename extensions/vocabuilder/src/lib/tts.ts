import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { z } from "zod";
import { BASE_URL, TTS_BITS_PER_SAMPLE, TTS_DEFAULT_VOICE, TTS_NUM_CHANNELS, TTS_SAMPLE_RATE } from "./gemini-config";
import { geminiError, geminiErrorLogFields } from "./geminiError";
import { throwForHttpError } from "./geminiHttp";
import { createLogger } from "./logger";
import { GeminiTtsResponseSchema } from "./types";

const MAX_CACHE_FILES = 50;
const log = createLogger("tts");

const GEMINI_SUPPORTED_LANGS = new Set([
  "en",
  "uk",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "pl",
  "cs",
  "sv",
  "ja",
  "ko",
  "zh",
  "tr",
  "ru",
  "be",
]);

const MACOS_VOICE_MAP: Record<string, string> = {
  en: "Samantha",
  uk: "Lesya",
  de: "Anna",
  fr: "Thomas",
  es: "Monica",
  it: "Alice",
  pt: "Luciana",
  nl: "Xander",
  pl: "Zosia",
  cs: "Zuzana",
  sv: "Alva",
  ja: "Kyoko",
  ko: "Yuna",
  zh: "Ting-Ting",
  tr: "Yelda",
  ru: "Milena",
};

export function isTtsSupported(langCode: string): boolean {
  return GEMINI_SUPPORTED_LANGS.has(langCode);
}

export function hasMacOsFallback(langCode: string): boolean {
  return langCode in MACOS_VOICE_MAP;
}

function macosVoiceForLanguage(langCode: string): string {
  return MACOS_VOICE_MAP[langCode] ?? "Samantha";
}

function prependWavHeader(pcm: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);
  header.write("RIFF", 0);
  header.writeUInt32LE(dataSize + headerSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function isExpectedTtsPcmMimeType(mimeType: string): boolean {
  const [rawType, ...rawParams] = mimeType.split(";");
  if (rawType.trim().toLowerCase() !== "audio/l16") {
    return false;
  }

  const params = new Map<string, string>();
  for (const rawParam of rawParams) {
    const [rawKey, ...rawValueParts] = rawParam.split("=");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValueParts.join("=").trim().toLowerCase();
    if (key) {
      params.set(key, value);
    }
  }

  const codec = params.get("codec");
  return params.get("rate") === String(TTS_SAMPLE_RATE) && (codec === undefined || codec === "pcm");
}

function getCacheDir(): string {
  const dir = path.join(environment.supportPath, "tts-cache");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cacheKey(word: string, langCode: string, model: string): string {
  const modelHash = createHash("sha256").update(model).digest("hex").slice(0, 8);
  const wordHash = createHash("sha256").update(word.toLowerCase()).digest("hex").slice(0, 32);
  return `${langCode}-${modelHash}-${wordHash}.wav`;
}

function evictOldestCacheFiles(dir: string, maxFiles: number): void {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".wav"))
    .map((name) => {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  while (files.length > maxFiles) {
    const oldest = files.shift()!;
    try {
      unlinkSync(oldest.filePath);
    } catch {
      // ignore cleanup failures
    }
  }
}

function playAudio(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/afplay", [filePath], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function generateSpeechGemini(
  text: string,
  apiKey: string,
  signal: AbortSignal | undefined,
  model: string,
): Promise<Buffer> {
  const url = `${BASE_URL}/${model}:generateContent`;
  const requestMs = log.timer();
  log.debug("gemini tts request started", { model, textChars: text.length });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_DEFAULT_VOICE },
            },
          },
        },
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      log.warn("gemini tts request failed", {
        model,
        requestMs: requestMs(),
        error: "network-offline",
      });
      throw geminiError({ domain: "infrastructure", kind: "network-offline", surface: "tts" });
    }
    log.warn("gemini tts request failed", {
      model,
      requestMs: requestMs(),
      error: err instanceof Error ? err.name : "unknown",
    });
    throw err;
  }

  try {
    await throwForHttpError(response, "tts", model);
  } catch (err) {
    log.warn("gemini tts request failed", {
      model,
      requestMs: requestMs(),
      ...geminiErrorLogFields(err),
    });
    throw err;
  }

  const rawJson = await response.text();
  log.debug("gemini tts request completed", {
    model,
    requestMs: requestMs(),
    responseChars: rawJson.length,
  });
  let apiData: z.infer<typeof GeminiTtsResponseSchema>;
  try {
    apiData = GeminiTtsResponseSchema.parse(JSON.parse(rawJson));
  } catch {
    throw geminiError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: "tts",
      body: rawJson.slice(0, 500),
    });
  }
  // Schema guarantees structural shape; `data` is allowed to be empty string,
  // which we surface separately as `empty-response` rather than rolling it
  // into invalid-response.
  const inlineData = apiData.candidates[0].content.parts[0].inlineData;
  const base64Audio = inlineData.data;

  if (!base64Audio) {
    throw geminiError({ domain: "infrastructure", kind: "empty-response", surface: "tts" });
  }

  if (!isExpectedTtsPcmMimeType(inlineData.mimeType)) {
    throw geminiError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: "tts",
      body: rawJson.slice(0, 500),
    });
  }

  const pcm = Buffer.from(base64Audio, "base64");
  return prependWavHeader(pcm, TTS_SAMPLE_RATE, TTS_NUM_CHANNELS, TTS_BITS_PER_SAMPLE);
}

export async function pronounce(
  word: string,
  apiKey: string,
  langCode: string,
  signal: AbortSignal | undefined,
  model: string,
): Promise<{ cached: boolean }> {
  const dir = getCacheDir();
  const fileName = cacheKey(word, langCode, model);
  const filePath = path.join(dir, fileName);

  signal?.throwIfAborted();

  let cached = true;
  if (!existsSync(filePath)) {
    cached = false;
    const wavBuffer = await generateSpeechGemini(word, apiKey, signal, model);
    writeFileSync(filePath, wavBuffer);
    evictOldestCacheFiles(dir, MAX_CACHE_FILES);
  }

  const playbackMs = log.timer();
  await playAudio(filePath);
  log.debug("tts playback completed", { model, langCode, cached, playbackMs: playbackMs() });
  return { cached };
}

export async function pronounceFallback(word: string, langCode: string): Promise<void> {
  const voice = macosVoiceForLanguage(langCode);
  const fallbackMs = log.timer();
  log.debug("system voice fallback started", { langCode, voice, wordChars: word.length });
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/say", ["-v", voice, word], (err) => {
      if (err) {
        log.warn("system voice fallback failed", {
          langCode,
          voice,
          fallbackMs: fallbackMs(),
          error: err.name,
          code: (err as NodeJS.ErrnoException).code,
        });
        reject(err);
      } else {
        log.debug("system voice fallback completed", { langCode, voice, fallbackMs: fallbackMs() });
        resolve();
      }
    });
  });
}

// --- In-source tests for private functions ---
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("macosVoiceForLanguage", () => {
    it("returns Samantha for English", () => {
      expect(macosVoiceForLanguage("en")).toBe("Samantha");
    });

    it("returns Lesya for Ukrainian", () => {
      expect(macosVoiceForLanguage("uk")).toBe("Lesya");
    });

    it("returns Samantha for unknown language", () => {
      expect(macosVoiceForLanguage("xx")).toBe("Samantha");
    });
  });

  describe("isTtsSupported", () => {
    it("returns true for languages with Gemini TTS voices", () => {
      expect(isTtsSupported("en")).toBe(true);
      expect(isTtsSupported("uk")).toBe(true);
      expect(isTtsSupported("be")).toBe(true);
    });

    it("returns false for unknown languages", () => {
      expect(isTtsSupported("xx")).toBe(false);
    });
  });

  describe("hasMacOsFallback", () => {
    it("returns true for languages with macOS voices", () => {
      expect(hasMacOsFallback("en")).toBe(true);
      expect(hasMacOsFallback("uk")).toBe(true);
    });

    it("returns false for Belarusian (no macOS voice)", () => {
      expect(hasMacOsFallback("be")).toBe(false);
    });
  });

  describe("cacheKey", () => {
    const MODEL = "gemini-3.1-flash-tts-preview";

    it("produces deterministic filesystem-safe names with fixed length", () => {
      const key = cacheKey("hello", "en", MODEL);
      // lang(2) + dash(1) + model-prefix(8) + dash(1) + word-prefix(32) + .wav(4) = 48 chars
      expect(key).toMatch(/^en-[0-9a-f]{8}-[0-9a-f]{32}\.wav$/);
      expect(key.length).toBe(48);
    });

    it("is case-insensitive on the word", () => {
      expect(cacheKey("Hello", "en", MODEL)).toBe(cacheKey("hello", "en", MODEL));
    });

    it("handles unicode words", () => {
      const key = cacheKey("привіт", "uk", MODEL);
      expect(key).toMatch(/^uk-[0-9a-f]{8}-[0-9a-f]{32}\.wav$/);
    });

    it("keeps filenames short even for long text", () => {
      const longText = "a".repeat(1000);
      const key = cacheKey(longText, "en", MODEL);
      expect(key.length).toBe(48);
    });

    it("changes when the model changes — switching models invalidates cache", () => {
      const a = cacheKey("hello", "en", "gemini-2.5-flash-preview-tts");
      const b = cacheKey("hello", "en", "gemini-3.1-flash-tts-preview");
      expect(a).not.toBe(b);
    });
  });

  describe("prependWavHeader", () => {
    it("produces a buffer starting with RIFF header", () => {
      const pcm = Buffer.alloc(100);
      const wav = prependWavHeader(pcm, 24000, 1, 16);
      expect(wav.length).toBe(144); // 44 header + 100 data
      expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
      expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
      expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
      expect(wav.toString("ascii", 36, 40)).toBe("data");
    });

    it("encodes correct sample rate", () => {
      const pcm = Buffer.alloc(48);
      const wav = prependWavHeader(pcm, 24000, 1, 16);
      expect(wav.readUInt32LE(24)).toBe(24000);
    });

    it("encodes correct data size", () => {
      const pcm = Buffer.alloc(200);
      const wav = prependWavHeader(pcm, 24000, 1, 16);
      expect(wav.readUInt32LE(40)).toBe(200);
    });

    it("encodes correct total file size in RIFF header", () => {
      const pcm = Buffer.alloc(200);
      const wav = prependWavHeader(pcm, 24000, 1, 16);
      expect(wav.readUInt32LE(4)).toBe(200 + 44 - 8); // dataSize + headerSize - 8
    });
  });

  describe("isExpectedTtsPcmMimeType", () => {
    it("accepts documented Gemini raw PCM MIME variants", () => {
      expect(isExpectedTtsPcmMimeType("audio/L16;rate=24000")).toBe(true);
      expect(isExpectedTtsPcmMimeType("audio/L16;codec=pcm;rate=24000")).toBe(true);
      expect(isExpectedTtsPcmMimeType("audio/l16; rate=24000; codec=PCM")).toBe(true);
    });

    it("rejects compressed or incompatible audio MIME variants before WAV wrapping", () => {
      expect(isExpectedTtsPcmMimeType("audio/ogg;codec=opus")).toBe(false);
      expect(isExpectedTtsPcmMimeType("audio/L16;rate=44100")).toBe(false);
      expect(isExpectedTtsPcmMimeType("audio/L16;codec=opus;rate=24000")).toBe(false);
      expect(isExpectedTtsPcmMimeType("audio/L16")).toBe(false);
    });
  });
}
