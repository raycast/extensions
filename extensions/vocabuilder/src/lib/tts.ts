import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { GeminiTtsResponseSchema } from "./types";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_VOICE = "Kore";
const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const MAX_CACHE_FILES = 50;

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

function getCacheDir(): string {
  const dir = path.join(environment.supportPath, "tts-cache");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cacheKey(word: string, langCode: string): string {
  const hash = createHash("sha256").update(word.toLowerCase()).digest("hex").slice(0, 32);
  return `${langCode}-${hash}.wav`;
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

async function generateSpeechGemini(text: string, apiKey: string, signal?: AbortSignal): Promise<Buffer> {
  const url = `${BASE_URL}/${TTS_MODEL}:generateContent`;

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
              prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE },
            },
          },
        },
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("NETWORK_OFFLINE");
    }
    throw err;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("INVALID_API_KEY");
  }

  if (!response.ok) {
    throw new Error("TTS_REQUEST_FAILED");
  }

  const apiData = GeminiTtsResponseSchema.parse(await response.json());
  const base64Audio = apiData.candidates[0]?.content.parts[0]?.inlineData.data;

  if (!base64Audio) {
    throw new Error("TTS_EMPTY_RESPONSE");
  }

  const pcm = Buffer.from(base64Audio, "base64");
  return prependWavHeader(pcm, SAMPLE_RATE, NUM_CHANNELS, BITS_PER_SAMPLE);
}

export async function pronounce(
  word: string,
  apiKey: string,
  langCode: string,
  signal?: AbortSignal,
): Promise<{ cached: boolean }> {
  const dir = getCacheDir();
  const fileName = cacheKey(word, langCode);
  const filePath = path.join(dir, fileName);

  signal?.throwIfAborted();

  let cached = true;
  if (!existsSync(filePath)) {
    cached = false;
    const wavBuffer = await generateSpeechGemini(word, apiKey, signal);
    writeFileSync(filePath, wavBuffer);
    evictOldestCacheFiles(dir, MAX_CACHE_FILES);
  }

  await playAudio(filePath);
  return { cached };
}

export async function pronounceFallback(word: string, langCode: string): Promise<void> {
  const voice = macosVoiceForLanguage(langCode);
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/say", ["-v", voice, word], (err) => {
      if (err) reject(err);
      else resolve();
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
    it("produces deterministic filesystem-safe names with fixed length", () => {
      const key = cacheKey("hello", "en");
      // lang(2) + dash(1) + sha256-prefix(32) + .wav(4) = 39 chars
      expect(key).toMatch(/^en-[0-9a-f]{32}\.wav$/);
      expect(key.length).toBe(39);
    });

    it("is case-insensitive", () => {
      expect(cacheKey("Hello", "en")).toBe(cacheKey("hello", "en"));
    });

    it("handles unicode words", () => {
      const key = cacheKey("привіт", "uk");
      expect(key).toMatch(/^uk-[0-9a-f]{32}\.wav$/);
    });

    it("keeps filenames short even for long text", () => {
      const longText = "a".repeat(1000);
      const key = cacheKey(longText, "en");
      expect(key.length).toBe(39);
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
}
