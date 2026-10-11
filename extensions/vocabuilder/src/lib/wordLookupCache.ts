import { normalizeWordInput } from "./input";
import type { WordSense } from "./types";

/** Successful word lookup kept for this Translate session so a reverted typo can skip the provider call. */
export type CachedWordLookup = {
  effectiveWord: string;
  originalInput: string;
  senses: WordSense[];
};

export type WordLookupScope = {
  pairPrefix: string;
  provider: string;
  model: string;
};

export type WordLookupCacheKey = WordLookupScope & {
  word: string;
};

export type WordLookupDecision =
  { kind: "none" } | { kind: "hit"; word: string; cached: CachedWordLookup } | { kind: "miss"; word: string };

export type WordLookupCache = {
  get(input: WordLookupCacheKey): CachedWordLookup | undefined;
  set(input: WordLookupCacheKey, value: CachedWordLookup): void;
  clear(): void;
};

const DEFAULT_MAX_ENTRIES = 50;

function cacheKey(input: WordLookupCacheKey): string {
  return [input.pairPrefix, input.provider, input.model, input.word].join("\0");
}

export function createWordLookupCache(maxEntries = DEFAULT_MAX_ENTRIES): WordLookupCache {
  const entries = new Map<string, CachedWordLookup>();

  return {
    get(input) {
      const key = cacheKey(input);
      const value = entries.get(key);
      if (value === undefined) return undefined;
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(input, value) {
      const key = cacheKey(input);
      if (entries.has(key)) entries.delete(key);
      entries.set(key, value);
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    clear() {
      entries.clear();
    },
  };
}

/**
 * Decide whether typed input should restore a previous word lookup, start a new
 * one, or wait for manual submit (phrases/text).
 */
export function decideWordLookup(
  rawText: string,
  cache: Pick<WordLookupCache, "get">,
  scope: WordLookupScope,
): WordLookupDecision {
  const word = normalizeWordInput(rawText);
  if (!word) return { kind: "none" };
  const cached = cache.get({ ...scope, word });
  if (cached) return { kind: "hit", word, cached };
  return { kind: "miss", word };
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  const scope: WordLookupScope = { pairPrefix: "en-uk", provider: "gemini", model: "gemini-3.5-flash" };

  const hello: CachedWordLookup = {
    effectiveWord: "hello",
    originalInput: "hello",
    senses: [
      {
        translation: "привіт",
        partOfSpeech: "interjection",
        example: "Привіт, як справи?",
        exampleTranslation: "Hello, how are you?",
      },
    ],
  };

  describe("decideWordLookup", () => {
    it("restores a previous word when the typed input returns to it after an extra letter", () => {
      const cache = createWordLookupCache();
      cache.set({ ...scope, word: "hello" }, hello);

      expect(decideWordLookup("hellox", cache, scope)).toEqual({ kind: "miss", word: "hellox" });
      expect(decideWordLookup("hello", cache, scope)).toEqual({ kind: "hit", word: "hello", cached: hello });
    });

    it("treats surrounding whitespace as the same cached word", () => {
      const cache = createWordLookupCache();
      cache.set({ ...scope, word: "hello" }, hello);

      expect(decideWordLookup("  hello  ", cache, scope)).toEqual({
        kind: "hit",
        word: "hello",
        cached: hello,
      });
    });

    it("does not restore across language pairs, providers or models", () => {
      const cache = createWordLookupCache();
      cache.set({ ...scope, word: "hello" }, hello);

      expect(decideWordLookup("hello", cache, { ...scope, pairPrefix: "uk-en" }).kind).toBe("miss");
      expect(decideWordLookup("hello", cache, { ...scope, provider: "anthropic" }).kind).toBe("miss");
      expect(decideWordLookup("hello", cache, { ...scope, model: "other-model" }).kind).toBe("miss");
    });

    it("leaves non-word input for manual submit instead of auto-translating", () => {
      const cache = createWordLookupCache();
      expect(decideWordLookup("hello, world.", cache, scope)).toEqual({ kind: "none" });
      expect(decideWordLookup("", cache, scope)).toEqual({ kind: "none" });
    });

    it("forgets lookups after clear so a new language pair does not reuse them", () => {
      const cache = createWordLookupCache();
      cache.set({ ...scope, word: "hello" }, hello);
      cache.clear();
      expect(decideWordLookup("hello", cache, scope)).toEqual({ kind: "miss", word: "hello" });
    });
  });

  describe("createWordLookupCache", () => {
    it("evicts the least recently used entry when full", () => {
      const cache = createWordLookupCache(2);
      const bye: CachedWordLookup = { ...hello, effectiveWord: "bye", originalInput: "bye" };
      const cat: CachedWordLookup = { ...hello, effectiveWord: "cat", originalInput: "cat" };

      cache.set({ ...scope, word: "hello" }, hello);
      cache.set({ ...scope, word: "bye" }, bye);
      cache.get({ ...scope, word: "hello" });
      cache.set({ ...scope, word: "cat" }, cat);

      expect(cache.get({ ...scope, word: "hello" })).toEqual(hello);
      expect(cache.get({ ...scope, word: "cat" })).toEqual(cat);
      expect(cache.get({ ...scope, word: "bye" })).toBeUndefined();
    });

    it("keys non-Latin lemmas without mangling them", () => {
      const cache = createWordLookupCache();
      const pryvit: CachedWordLookup = {
        effectiveWord: "привіт",
        originalInput: "привіт",
        senses: hello.senses,
      };
      cache.set({ ...scope, word: "привіт" }, pryvit);
      expect(cache.get({ ...scope, word: "привіт" })).toEqual(pryvit);
    });
  });
}
