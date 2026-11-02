import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { resolveBaseUrl } from "./baseUrl";
import { createLogger } from "./logger";
import { resolveTtsConfig, ttsFor, type ProviderPreferences } from "./providers";
import { PROVIDER_IDS, type TtsConfig } from "./providers/types";

const MAX_CACHE_FILES = 50;
const log = createLogger("tts");

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

export function hasMacOsFallback(langCode: string): boolean {
  return langCode in MACOS_VOICE_MAP;
}

export type PronunciationPreferences = ProviderPreferences & { pronunciation?: "auto" | "system" };

/**
 * How a Pronounce action plays this language:
 * - `unavailable`: nothing can speak it, so the action and its detail-pane row are hidden;
 * - `system`: the macOS voice directly — "System Voice" was chosen, the provider has no
 *   speech endpoint, or its endpoint does not cover the language;
 * - `provider`: the provider's speech endpoint, with the system voice as fallback;
 * - `misconfigured`: the provider preferences are invalid (an unrecognized key on Auto);
 *   pressing the action reports `error` through the TTS error router.
 */
export type PronunciationPlan =
  | { kind: "unavailable" }
  | { kind: "system" }
  | { kind: "provider"; config: TtsConfig }
  | { kind: "misconfigured"; error: unknown };

export function planPronunciation(langCode: string, prefs: PronunciationPreferences): PronunciationPlan {
  const systemOrNothing: PronunciationPlan = hasMacOsFallback(langCode) ? { kind: "system" } : { kind: "unavailable" };
  if (prefs.pronunciation === "system") return systemOrNothing;

  let config: TtsConfig | null;
  try {
    config = resolveTtsConfig(prefs);
  } catch (error) {
    const anyVoice = hasMacOsFallback(langCode) || PROVIDER_IDS.some((id) => ttsFor(id)?.supportsLanguage(langCode));
    return anyVoice ? { kind: "misconfigured", error } : { kind: "unavailable" };
  }

  if (config && ttsFor(config.provider).supportsLanguage(langCode)) return { kind: "provider", config };
  return systemOrNothing;
}

function macosVoiceForLanguage(langCode: string): string {
  return MACOS_VOICE_MAP[langCode] ?? "Samantha";
}

function getCacheDir(): string {
  const dir = path.join(environment.supportPath, "tts-cache");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Keyed on everything that decides what the audio sounds like except the word
// itself — including the provider and endpoint, since a different backend
// renders the same word differently.
function cacheKey(word: string, langCode: string, variant: string): string {
  const variantHash = createHash("sha256").update(variant).digest("hex").slice(0, 8);
  const wordHash = createHash("sha256").update(word.toLowerCase()).digest("hex").slice(0, 32);
  return `${langCode}-${variantHash}-${wordHash}.wav`;
}

function cacheVariant(config: TtsConfig, cacheVersion: string, resolvedBaseUrl: string): string {
  return [config.provider, config.model.trim(), cacheVersion, resolvedBaseUrl].join(":");
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

function playAudio(filePath: string, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/afplay", [filePath], { signal }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function pronounce(
  word: string,
  langCode: string,
  config: TtsConfig,
  signal?: AbortSignal,
): Promise<{ cached: boolean }> {
  const adapter = ttsFor(config.provider);
  // Resolved before the cache lookup so the key is per-endpoint and a cache hit
  // cannot skip validation of a misconfigured base URL.
  const resolvedBaseUrl = resolveBaseUrl(config.baseUrl, config.provider, "tts");
  const dir = getCacheDir();
  const fileName = cacheKey(word, langCode, cacheVariant(config, adapter.cacheVersion, resolvedBaseUrl));
  const filePath = path.join(dir, fileName);

  signal?.throwIfAborted();

  let cached = true;
  if (!existsSync(filePath)) {
    cached = false;
    const wavBuffer = await adapter.synthesize(word, langCode, config, signal);
    writeFileSync(filePath, wavBuffer);
    evictOldestCacheFiles(dir, MAX_CACHE_FILES);
  }

  const playbackMs = log.timer();
  await playAudio(filePath, signal);
  log.debug("tts playback completed", {
    provider: config.provider,
    model: config.model.trim(),
    langCode,
    cached,
    playbackMs: playbackMs(),
  });
  return { cached };
}

export async function pronounceFallback(word: string, langCode: string, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const voice = macosVoiceForLanguage(langCode);
  const fallbackMs = log.timer();
  log.debug("system voice fallback started", { langCode, voice, wordChars: word.length });
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/say", ["-v", voice, word], { signal }, (err) => {
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

  describe("planPronunciation", () => {
    const prefs = (overrides: Partial<PronunciationPreferences>): PronunciationPreferences => ({
      provider: "auto",
      apiKey: "AIzaSyTest",
      pronunciation: "auto",
      ...overrides,
    });

    it("uses the provider voice, including for a language with no macOS voice", () => {
      const plan = planPronunciation("be", prefs({}));
      expect(plan.kind).toBe("provider");
      expect(plan.kind === "provider" && plan.config.provider).toBe("gemini");
    });

    it("goes straight to the system voice when System Voice is chosen, even for a provider with speech", () => {
      expect(planPronunciation("uk", prefs({ pronunciation: "system" }))).toEqual({ kind: "system" });
    });

    it("goes straight to the system voice for providers without a speech endpoint", () => {
      expect(planPronunciation("en", prefs({ provider: "anthropic" }))).toEqual({ kind: "system" });
      expect(planPronunciation("en", prefs({ provider: "auto", apiKey: "sk-ant-api03-abc" }))).toEqual({
        kind: "system",
      });
      expect(planPronunciation("en", prefs({ provider: "openai-compatible", apiKey: "any" }))).toEqual({
        kind: "system",
      });
    });

    it.each(["tts-1", "tts-1-hd"])("uses language-specific system voices for the OpenAI model %s", (ttsModel) => {
      const legacy = prefs({ apiKey: "sk-abc", ttsModel: ` ${ttsModel} ` });
      for (const langCode of ["en", "pl", "fr", "uk"]) {
        expect(planPronunciation(langCode, legacy)).toEqual({ kind: "system" });
      }
      expect(planPronunciation("be", legacy)).toEqual({ kind: "unavailable" });
      expect(planPronunciation("xx", legacy)).toEqual({ kind: "unavailable" });
    });

    it("keeps the default and instruction-capable custom OpenAI models on the provider path", () => {
      for (const ttsModel of ["", " gpt-4o-mini-tts-2025-12-15 "]) {
        expect(planPronunciation("be", prefs({ apiKey: "sk-abc", ttsModel }))).toMatchObject({
          kind: "provider",
          config: { provider: "openai" },
        });
      }
    });

    it("hides the action when only the system voice could speak and it has no voice for the language", () => {
      expect(planPronunciation("be", prefs({ pronunciation: "system" }))).toEqual({ kind: "unavailable" });
      expect(planPronunciation("be", prefs({ provider: "anthropic" }))).toEqual({ kind: "unavailable" });
      expect(planPronunciation("xx", prefs({}))).toEqual({ kind: "unavailable" });
    });

    it("keeps the action for an unrecognized key so pressing it explains the configuration error", () => {
      const plan = planPronunciation("en", prefs({ apiKey: "ollama" }));
      expect(plan.kind).toBe("misconfigured");
      expect(plan.kind === "misconfigured" && plan.error).toMatchObject({ message: "provider-undetected" });
    });

    it("hides the action for an unrecognized key when no voice at all covers the language", () => {
      expect(planPronunciation("xx", prefs({ apiKey: "ollama" }))).toEqual({ kind: "unavailable" });
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
    const VARIANT = "gemini:gemini-3.1-flash-tts-preview:v2:https://generativelanguage.googleapis.com/v1beta/models";

    it("produces deterministic filesystem-safe names with fixed length", () => {
      const key = cacheKey("hello", "en", VARIANT);
      // lang(2) + dash(1) + variant-prefix(8) + dash(1) + word-prefix(32) + .wav(4) = 48 chars
      expect(key).toMatch(/^en-[0-9a-f]{8}-[0-9a-f]{32}\.wav$/);
      expect(key.length).toBe(48);
    });

    it("is case-insensitive on the word", () => {
      expect(cacheKey("Hello", "en", VARIANT)).toBe(cacheKey("hello", "en", VARIANT));
    });

    it("handles unicode words", () => {
      expect(cacheKey("привіт", "uk", VARIANT)).toMatch(/^uk-[0-9a-f]{8}-[0-9a-f]{32}\.wav$/);
    });

    it("keeps filenames short even for long text", () => {
      expect(cacheKey("a".repeat(1000), "en", VARIANT).length).toBe(48);
    });

    it("changes when the language changes so cross-language homographs do not share audio", () => {
      expect(cacheKey("but", "en", VARIANT)).not.toBe(cacheKey("but", "pl", VARIANT));
    });
  });

  describe("cacheVariant", () => {
    const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
    const config: TtsConfig = { provider: "gemini", apiKey: "k", model: "gemini-3.1-flash-tts-preview", baseUrl: "" };

    it("changes when the provider, model, adapter version or endpoint changes", () => {
      const base = cacheVariant(config, "v2", BASE);
      expect(cacheVariant({ ...config, provider: "openai" }, "v2", BASE)).not.toBe(base);
      expect(cacheVariant({ ...config, model: "gemini-2.5-flash-preview-tts" }, "v2", BASE)).not.toBe(base);
      expect(cacheVariant(config, "v3", BASE)).not.toBe(base);
      expect(cacheVariant(config, "v2", "http://localhost:4000/v1beta/models")).not.toBe(base);
    });

    it("ignores the API key and surrounding whitespace in the model", () => {
      expect(cacheVariant({ ...config, apiKey: "other", model: ` ${config.model} ` }, "v2", BASE)).toBe(
        cacheVariant(config, "v2", BASE),
      );
    });
  });
}
