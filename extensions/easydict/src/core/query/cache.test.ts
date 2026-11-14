import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectionDecision } from "@/core/detect/types";
import { DictionaryType, LanguageDetectType, TranslationType } from "@/core/results/kinds";
import type { DictionaryResult, QueryInput, RuntimeServiceConfig, TranslationResult } from "@/core/results/types";

import {
  cacheLanguageDetection,
  cacheQueryResult,
  clearQueryCache,
  getCachedLanguageDetection,
  getCachedQueryResult,
  getQueryCacheGeneration,
  hasEnabledQueryCache,
} from "./cache";

const testState = vi.hoisted(() => ({
  caches: new Map<string, Map<string, string>>(),
  preferences: {
    queryCacheMode: "words",
    aiQueryCacheMode: "off",
    language1: "zh-CHS",
    language2: "en",
    enableDetectLanguageSpeedFirst: true,
    enableBaiduLanguageDetect: true,
    enableTencentLanguageDetect: false,
    enableVolcanoLanguageDetect: false,
  },
}));

vi.mock("@raycast/api", () => ({
  Cache: class {
    private storage: Map<string, string>;

    constructor(options?: { namespace?: string }) {
      const namespace = options?.namespace ?? "default";
      let storage = testState.caches.get(namespace);
      if (!storage) {
        storage = new Map();
        testState.caches.set(namespace, storage);
      }
      this.storage = storage;
    }

    get(key: string) {
      return this.storage.get(key);
    }

    set(key: string, value: string) {
      this.storage.set(key, value);
    }

    remove(key: string) {
      return this.storage.delete(key);
    }

    clear() {
      this.storage.clear();
    }
  },
}));

vi.mock("@/consts", () => ({ myPreferences: testState.preferences }));
vi.mock("@/shared/logger", () => ({ logWarn: vi.fn() }));

const query = { word: "cache", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true } as const;

beforeEach(() => {
  vi.useRealTimers();
  testState.preferences.queryCacheMode = "words";
  testState.preferences.aiQueryCacheMode = "off";
  clearQueryCache();
});

describe("query cache", () => {
  it("reuses completed word translations and invalidates them when request configuration changes", () => {
    const service = createService("builtin:translation:Bing", "credential-a");
    const result = createTranslationResult();

    cacheQueryResult(service, query, result);

    expect(getCachedQueryResult(service, query)).toEqual(result);
    expect(getCachedQueryResult({ ...service, cacheIdentity: "credential-b" }, query)).toBeUndefined();
    expect([...testState.caches.get("query-results")!.keys()][0]).not.toContain("credential-a");
  });

  it("does not persist text outside the selected policy or AI results by default", () => {
    const regular = createService("builtin:translation:Bing", "regular");
    const ai = createService("ai:profile", "model-a");
    const sentence = { ...query, word: "This is longer than twenty characters.", isWord: false };

    cacheQueryResult(regular, sentence, createTranslationResult(sentence));
    cacheQueryResult(ai, query, createTranslationResult());

    expect(getCachedQueryResult(regular, sentence)).toBeUndefined();
    expect(getCachedQueryResult(ai, query)).toBeUndefined();
  });

  it.each(["I love you", "今天心情不好"])(
    "does not persist an unclassified short sentence in Words Only mode: %s",
    (word) => {
      const service = createService("builtin:translation:Bing", "regular");
      const sentence = { word, fromLanguage: "en", toLanguage: "zh-CHS" };
      const detection: DetectionDecision = { type: LanguageDetectType.Bing, language: "en", confirmed: true };

      cacheQueryResult(service, sentence, createTranslationResult(sentence));
      cacheLanguageDetection(word, detection);

      expect(getCachedQueryResult(service, sentence)).toBeUndefined();
      expect(getCachedLanguageDetection(word)).toBeUndefined();
      expect(testState.caches.get("query-results")?.size).toBe(0);
      expect(testState.caches.get("query-language-detection")?.size).toBe(0);
    },
  );

  it("does not let work started before a clear operation repopulate the cache", () => {
    const service = createService("builtin:translation:Bing", "regular");
    const requestCacheGeneration = getQueryCacheGeneration();

    clearQueryCache();
    cacheQueryResult(service, query, createTranslationResult(), requestCacheGeneration);
    cacheLanguageDetection(
      query.word,
      {
        type: LanguageDetectType.Bing,
        language: "en",
        confirmed: true,
      },
      requestCacheGeneration,
    );

    expect(getCachedQueryResult(service, query)).toBeUndefined();
    expect(getCachedLanguageDetection(query.word)).toBeUndefined();
  });

  it("expires translation entries after 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const service = createService("builtin:translation:Bing", "regular");
    cacheQueryResult(service, query, createTranslationResult());

    vi.setSystemTime(new Date("2026-01-02T00:00:00.001Z"));

    expect(getCachedQueryResult(service, query)).toBeUndefined();
  });

  it("discards a corrupted entry instead of returning it", () => {
    const service = createService("builtin:translation:Bing", "regular");
    cacheQueryResult(service, query, createTranslationResult());
    const storage = testState.caches.get("query-results")!;
    const key = [...storage.keys()].find((candidate) => storage.get(candidate)?.includes('"content"'))!;
    storage.set(key, "{not-json");

    expect(getCachedQueryResult(service, query)).toBeUndefined();
    expect(storage.has(key)).toBe(false);
  });

  it.each([
    { version: 1, value: { type: TranslationType.Bing, queryWordInfo: query, translations: ["old"] } },
    { version: 999, value: createTranslationResult() },
    { version: 2, value: { type: "unknown", content: createTranslationResult().content } },
    { version: 2, value: { type: DictionaryType.AI, content: createTranslationResult().content } },
    {
      version: 2,
      value: {
        type: DictionaryType.AI,
        content: {
          kind: "dictionary",
          query,
          sections: [
            {
              kind: "definitions",
              entries: [{ kind: "structured", meanings: ["hello"], examples: [{ sentence: 17 }] }],
            },
          ],
        },
      },
    },
  ])("discards old, future, or malformed content before replay (%j)", ({ version, value }) => {
    const service = createService("builtin:translation:Bing", "regular");
    cacheQueryResult(service, query, createTranslationResult());
    const storage = testState.caches.get("query-results")!;
    const key = [...storage.keys()].find((candidate) => storage.get(candidate)?.includes('"content"'))!;
    storage.set(key, JSON.stringify({ version, expiresAt: Date.now() + 10000, value }));
    expect(getCachedQueryResult(service, query)).toBeUndefined();
    expect(storage.has(key)).toBe(false);
  });

  it("replays valid semantic sections independently of provider-specific layouts", () => {
    testState.preferences.aiQueryCacheMode = "words";
    const service = createService("ai:profile", "model-a");
    const result: DictionaryResult = {
      type: DictionaryType.AI,
      content: {
        kind: "dictionary",
        query,
        sections: [{ kind: "examples", entries: [{ sentence: "Cache the result", translation: "缓存结果" }] }],
      },
    };
    cacheQueryResult(service, query, result);
    expect(getCachedQueryResult(service, query)).toEqual(result);
  });

  it("stores content version 2 while retaining version 1 word evidence and seven-day dictionary expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const service = createService("builtin:dictionary:Youdao", "regular");
    const input = { word: "你好", fromLanguage: "zh-CHS", toLanguage: "en" };
    const value = {
      type: DictionaryType.Youdao,
      content: {
        kind: "dictionary" as const,
        query: { ...input, isWord: true },
        sections: [{ kind: "translation" as const, text: "hello" }],
      },
    };
    cacheQueryResult(service, input, value);
    const entries = [...testState.caches.get("query-results")!.values()].map((text) => JSON.parse(text));
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ version: 1, value: true }),
        expect.objectContaining({ version: 2, value }),
      ]),
    );
    vi.setSystemTime(new Date("2026-01-07T23:59:59Z"));
    expect(getCachedQueryResult(service, input)).toEqual(value);
    vi.setSystemTime(new Date("2026-01-08T00:00:00.001Z"));
    expect(getCachedQueryResult(service, input)).toBeUndefined();
  });

  it.each([{ type: "unknown" }, { youdaoLangCode: "unknown" }, { youdaoLangCode: "auto" }, { confirmed: false }])(
    "discards cached detections that cannot produce a confirmed decision (%j)",
    (override) => {
      const detection: DetectionDecision = { type: LanguageDetectType.Bing, language: "en", confirmed: true };
      cacheLanguageDetection(query.word, detection);
      const storage = testState.caches.get("query-language-detection")!;
      const key = [...storage.keys()][0];
      const value = {
        type: LanguageDetectType.Bing,
        youdaoLangCode: "en",
        sourceLangCode: "en",
        confirmed: true,
        ...override,
      };
      storage.set(key, JSON.stringify({ version: 1, expiresAt: Date.now() + 10000, value }));
      expect(getCachedLanguageDetection(query.word)).toBeUndefined();
      expect(storage.has(key)).toBe(false);
    },
  );

  it("decodes old confirmed cache entries without exposing provider observations", () => {
    cacheLanguageDetection(query.word, { type: LanguageDetectType.Bing, language: "en", confirmed: true });
    const storage = testState.caches.get("query-language-detection")!;
    const key = [...storage.keys()][0];
    storage.set(
      key,
      JSON.stringify({
        version: 1,
        expiresAt: Date.now() + 10000,
        value: {
          type: LanguageDetectType.Franc,
          youdaoLangCode: "fil",
          sourceLangCode: "tgl",
          confirmed: true,
          prior: true,
          detectedLanguageArray: [["tgl", 1]],
          result: { wire: "opaque" },
        },
      }),
    );
    expect(getCachedLanguageDetection(query.word)).toEqual({
      type: LanguageDetectType.Franc,
      language: "tl",
      confirmed: true,
    });
  });

  it("caches only confirmed detection results and isolates detection settings", () => {
    const detection: DetectionDecision = { type: LanguageDetectType.Bing, language: "en", confirmed: true };
    cacheLanguageDetection(query.word, detection);
    expect(getCachedLanguageDetection(query.word)).toEqual(detection);
    const serialized = [...testState.caches.get("query-language-detection")!.values()][0];
    expect(JSON.parse(serialized)).toMatchObject({
      version: 1,
      value: {
        type: LanguageDetectType.Bing,
        youdaoLangCode: "en",
        sourceLangCode: "",
        confirmed: true,
      },
    });
    expect(JSON.parse(serialized).value).not.toHaveProperty("language");

    testState.preferences.enableDetectLanguageSpeedFirst = false;
    expect(getCachedLanguageDetection(query.word)).toBeUndefined();
    testState.preferences.enableDetectLanguageSpeedFirst = true;

    cacheLanguageDetection("uncertain", { ...detection, confirmed: false });
    expect(getCachedLanguageDetection("uncertain")).toBeUndefined();
    cacheLanguageDetection("unmapped", { type: LanguageDetectType.Bing, language: "auto", confirmed: false });
    expect(getCachedLanguageDetection("unmapped")).toBeUndefined();
  });

  it("reports an enabled cache only while at least one mode is not off", () => {
    testState.preferences.queryCacheMode = "off";
    testState.preferences.aiQueryCacheMode = "off";
    expect(hasEnabledQueryCache()).toBe(false);

    testState.preferences.queryCacheMode = "words";
    expect(hasEnabledQueryCache()).toBe(true);

    testState.preferences.queryCacheMode = "off";
    testState.preferences.aiQueryCacheMode = "all";
    expect(hasEnabledQueryCache()).toBe(true);
  });
});

function createService(providerKey: string, cacheIdentity: string): RuntimeServiceConfig {
  return { id: providerKey, label: providerKey, providerKey, order: 0, cacheIdentity };
}

function createTranslationResult(queryWordInfo: QueryInput = query): TranslationResult {
  return {
    type: TranslationType.Bing,
    content: { kind: "translation", query: queryWordInfo, paragraphs: ["缓存"] },
  };
}
