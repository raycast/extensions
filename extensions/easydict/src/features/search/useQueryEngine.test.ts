// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren, StrictMode, useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderSelectedRow } from "@/core/content/render";
import type { DictionaryContent, TranslationContent } from "@/core/content/types";
import type { DetectionDecision } from "@/core/detect/types";
import { englishLanguageItem } from "@/core/language/consts";
import type { LanguageCode } from "@/core/language/types";
import { cacheQueryResult, clearQueryCache, getCachedQueryResult } from "@/core/query/cache";
import { getDisplaySectionIds, getListItemId } from "@/core/query/displayIdentities";
import { QueryRunner, type QueryServiceSnapshot } from "@/core/query/QueryRunner";
import { DictionaryType, LanguageDetectType, TranslationType } from "@/core/results/kinds";
import type { QueryInput, RequestOptions, StreamChunk } from "@/core/results/types";
import { buildFavoriteWord, resolveFavoriteTranslations } from "@/features/favorites/model";
import { favoriteMarkdown } from "@/features/favorites/view";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import type { TranslationServiceConfig } from "@/providers/translation";
import { BaseNonStreamingTranslateProvider, BaseStreamingTranslateProvider } from "@/providers/translation/base";

import { useQueryEngine } from "./useQueryEngine";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

interface DictionaryRequest {
  queryWordInfo: QueryInput;
  signal?: AbortSignal;
  deferred: Deferred<DictionaryContent>;
}

interface TranslationRequest {
  queryWordInfo: QueryInput;
  signal?: AbortSignal;
  deferred: Deferred<TranslationContent>;
}

const testDoubles = vi.hoisted(() => ({
  raycastCaches: new Map<string, Map<string, string>>(),
  detectLanguage: vi.fn(),
  playQueryWordAudio: vi.fn(),
  showFailureToast: vi.fn(),
  queryCacheMode: "off",
  aiQueryCacheMode: "off",
}));

vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
  Cache: class {
    private storage: Map<string, string>;

    constructor(options?: { namespace?: string }) {
      const namespace = options?.namespace ?? "default";
      let storage = testDoubles.raycastCaches.get(namespace);
      if (!storage) {
        storage = new Map();
        testDoubles.raycastCaches.set(namespace, storage);
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

vi.mock("@/consts", () => ({
  myPreferences: {
    enableDeepLTranslate: false,
    enableYoudaoDictionary: false,
    enableYoudaoTranslate: false,
    enableLingueeDictionary: true,
    enableAutomaticPlayWordAudio: true,
    flagsAreNotLanguages: false,
    language1: "zh-CHS",
    language2: "en",
    enableDetectLanguageSpeedFirst: true,
    enableBaiduLanguageDetect: true,
    enableTencentLanguageDetect: false,
    enableVolcanoLanguageDetect: false,
    baiduAppId: undefined,
    baiduAppSecret: undefined,
    tencentSecretId: "",
    tencentSecretKey: undefined,
    volcanoAccessKeyId: "",
    volcanoAccessKeySecret: undefined,
    get queryCacheMode() {
      return testDoubles.queryCacheMode;
    },
    get aiQueryCacheMode() {
      return testDoubles.aiQueryCacheMode;
    },
  },
}));

vi.mock("@/core/config", async () => {
  const { englishLanguageItem, chineseLanguageItem } = await import("@/core/language/consts");
  return { config: { servicesOrder: [], preferredLanguages: [englishLanguageItem, chineseLanguageItem] } };
});

vi.mock("@/core/detect", () => ({
  detectLanguage: testDoubles.detectLanguage,
}));

vi.mock("@/core/audio", () => ({
  playQueryWordAudio: testDoubles.playQueryWordAudio,
}));

vi.mock("@raycast/utils", () => ({
  showFailureToast: testDoubles.showFailureToast,
}));

vi.mock("@/shared/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logSummary: vi.fn(),
  logTrace: vi.fn(),
  logWarn: vi.fn(),
}));

const dictionaryServices: DictionaryServiceConfig[] = [];
const dictionarySnapshot = { dictionaryServices, translationServices: [] };
const dictionaryRequests: DictionaryRequest[] = [];
const translationRequests: QueryInput[] = [];
const deferredTranslationRequests: TranslationRequest[] = [];

class DeferredDictionaryProvider extends BaseDictionaryProvider {
  constructor(public type = DictionaryType.Linguee) {
    super();
  }

  protected doQuery(queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryContent> {
    const deferred = createDeferred<DictionaryContent>();
    dictionaryRequests.push({ queryWordInfo, signal: options?.signal, deferred });
    return deferred.promise;
  }
}

class RecordingTranslationProvider extends BaseNonStreamingTranslateProvider {
  type = TranslationType.OpenAI;

  protected async doTranslate(queryWordInfo: QueryInput): Promise<TranslationContent> {
    translationRequests.push(queryWordInfo);
    return {
      kind: "translation",
      query: queryWordInfo,
      paragraphs: ["translated"],
    };
  }
}

class DeferredTranslationProvider extends BaseNonStreamingTranslateProvider {
  constructor(public type = TranslationType.OpenAI) {
    super();
  }

  protected doTranslate(queryWordInfo: QueryInput, options?: RequestOptions): Promise<TranslationContent> {
    const deferred = createDeferred<TranslationContent>();
    deferredTranslationRequests.push({ queryWordInfo, signal: options?.signal, deferred });
    return deferred.promise;
  }
}

beforeEach(() => {
  dictionaryRequests.length = 0;
  translationRequests.length = 0;
  deferredTranslationRequests.length = 0;
  testDoubles.detectLanguage.mockReset();
  testDoubles.playQueryWordAudio.mockReset().mockResolvedValue(undefined);
  testDoubles.showFailureToast.mockReset();
  testDoubles.queryCacheMode = "off";
  testDoubles.aiQueryCacheMode = "off";
  clearQueryCache();
  dictionaryServices.splice(0, dictionaryServices.length, {
    id: `static:${DictionaryType.Linguee}`,
    label: DictionaryType.Linguee,
    providerKey: `builtin:dictionary:${DictionaryType.Linguee}`,
    order: 0,
    type: DictionaryType.Linguee,
    enabled: () => true,
    createProvider: () => new DeferredDictionaryProvider(),
    canTriggerAutomaticAudio: true,
  });
});

afterEach(() => {
  cleanup();
});

describe("useQueryEngine query generations", () => {
  it("removes Linguee's supplemental metadata when regenerated Youdao results no longer supply it", async () => {
    const youdaoService: DictionaryServiceConfig = {
      id: "static:youdao",
      label: DictionaryType.Youdao,
      providerKey: "builtin:dictionary:Youdao",
      order: 1,
      type: DictionaryType.Youdao,
      enabled: () => true,
      createProvider: () => new DeferredDictionaryProvider(DictionaryType.Youdao),
      canTriggerAutomaticAudio: false,
    };
    const { result } = renderHook(() =>
      useQueryEngine(englishLanguageItem, {
        dictionaryServices: [...dictionaryServices, youdaoService],
        translationServices: [],
      }),
    );
    const query = createQueryInput("metadata");
    act(() => result.current.queryTextWithTextInfo(query));

    const linguee = createDictionaryContent(query);
    await act(async () => {
      dictionaryRequests[0].deferred.resolve(linguee);
      dictionaryRequests[1].deferred.resolve(
        createYoudaoContent(query, { phonetic: "supplement", examTypes: ["CET4"] }),
      );
    });
    expect(result.current.viewSections[0].items[0].accessory).toEqual({
      phonetic: "supplement",
      examTypes: ["CET4"],
    });

    act(() => result.current.regenerateService(youdaoService.id));
    await act(async () => dictionaryRequests[2].deferred.resolve(createYoudaoContent(query)));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.viewSections[0].items[0].accessory).toBeUndefined();
  });

  it("reuses a completed cached dictionary result without calling its provider again", async () => {
    testDoubles.queryCacheMode = "words";
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));
    const query = createQueryInput("cached");

    act(() => result.current.queryTextWithTextInfo(query));
    await resolveDictionaryRequest(0);

    act(() => result.current.queryTextWithTextInfo(query));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(dictionaryRequests).toHaveLength(1);
    expect(result.current.viewSections[0].items[0].service.fromCache).toBe(true);
  });

  it("regenerates only the selected AI service even when its completed result is cached", async () => {
    testDoubles.aiQueryCacheMode = "words";
    const aiService: TranslationServiceConfig = {
      id: "profile:test",
      label: "Test AI",
      providerKey: "ai:test",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new RecordingTranslationProvider(),
    };
    const { result } = renderHook(() =>
      useQueryEngine(englishLanguageItem, {
        translationServices: [aiService],
        dictionaryServices: [],
      }),
    );
    const query = createQueryInput("generate");

    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(translationRequests).toHaveLength(1);

    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(result.current.viewSections[0].items[0].service.fromCache).toBe(true));
    expect(translationRequests).toHaveLength(1);

    act(() => result.current.regenerateService(aiService.id));
    await waitFor(() => expect(translationRequests).toHaveLength(2));
  });

  it("keeps only the latest regeneration when same-service requests finish out of order", async () => {
    testDoubles.aiQueryCacheMode = "words";
    const aiService: TranslationServiceConfig = {
      id: "profile:deferred",
      label: "Deferred AI",
      providerKey: "ai:deferred",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new DeferredTranslationProvider(),
    };
    const { result } = renderHook(() =>
      useQueryEngine(englishLanguageItem, {
        translationServices: [aiService],
        dictionaryServices: [],
      }),
    );
    const query = createQueryInput("generate");

    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(1));
    act(() => result.current.regenerateService(aiService.id));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(2));
    act(() => result.current.regenerateService(aiService.id));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(3));

    expect(deferredTranslationRequests[0].signal?.aborted).toBe(true);
    expect(deferredTranslationRequests[1].signal?.aborted).toBe(true);
    expect(deferredTranslationRequests[2].signal?.aborted).toBe(false);

    await resolveTranslationRequest(2, "latest");
    await waitFor(() => expect(result.current.viewSections[0].items[0].title).toBe("latest"));
    expect(result.current.isLoading).toBe(false);

    await resolveTranslationRequest(1, "middle");
    await resolveTranslationRequest(0, "oldest");
    expect(result.current.viewSections[0].items[0].title).toBe("latest");
    expect(getCachedQueryResult(aiService, query)).toMatchObject({ content: { paragraphs: ["latest"] } });
  });

  it("does not cache a provider result that completes after the cache was cleared", async () => {
    testDoubles.queryCacheMode = "words";
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));
    const query = createQueryInput("pending");

    act(() => result.current.queryTextWithTextInfo(query));
    clearQueryCache();
    await resolveDictionaryRequest(0);

    expect(result.current.viewSections).not.toEqual([]);
    expect(getCachedQueryResult(dictionaryServices[0], query)).toBeUndefined();
  });

  it.each(["translation first", "dictionary first"])(
    "projects hidden supplements in either completion order, caches raw results, and saves the final display (%s)",
    async (order) => {
      testDoubles.queryCacheMode = "words";
      const deepLService: TranslationServiceConfig = {
        id: "static:deepl",
        label: TranslationType.DeepL,
        providerKey: "builtin:translation:DeepL",
        order: 1,
        type: TranslationType.DeepL,
        enabled: () => true,
        createProvider: () => new DeferredTranslationProvider(TranslationType.DeepL),
      };
      const snapshot = { dictionaryServices, translationServices: [deepLService] };
      const { result } = renderHook(() => useQueryEngine(englishLanguageItem, snapshot));
      const query = createQueryInput("word");
      act(() => result.current.queryTextWithTextInfo(query));
      expect(result.current.listEpoch).toBe(0);
      await waitFor(() => expect(deferredTranslationRequests).toHaveLength(1));

      if (order === "translation first") {
        await resolveTranslationRequest(0, "translated");
        expect(result.current.viewSections).toEqual([]);
        expect(result.current.listEpoch).toBe(0);
        expect(result.current.isLoading).toBe(true);
        await resolveDictionaryRequest(0);
      } else {
        await resolveDictionaryRequest(0);
        expect(result.current.viewSections[0].items[0].title).toBe("word");
        expect(result.current.listEpoch).toBe(1);
        expect(result.current.isLoading).toBe(true);
        await resolveTranslationRequest(0, "translated");
      }

      expect(result.current.isLoading).toBe(false);
      expect(result.current.listEpoch).toBe(1);
      expect(result.current.viewSections).toHaveLength(1);
      expect(result.current.viewSections[0].items[0]).toMatchObject({
        title: "translated",
        copyText: "translated",
      });
      expect(renderSelectedRow(result.current.viewSections[0].items[0], result.current.viewSections)).toBe(
        "**translated**",
      );
      expect(getCachedQueryResult(dictionaryServices[0], query)).toEqual({
        type: DictionaryType.Linguee,
        content: createDictionaryContent(query),
      });
      expect(getCachedQueryResult(deepLService, query)).toEqual({
        type: TranslationType.DeepL,
        content: { kind: "translation", query, paragraphs: ["translated"] },
      });
      const favorite = buildFavoriteWord(query, result.current.composedContent.services);
      expect(favoriteMarkdown(favorite)).toContain("**translated**");
      expect(resolveFavoriteTranslations(favorite)).toEqual(["translated"]);
      expect(JSON.stringify(favorite)).not.toContain("showMoreDetailsMarkdown");

      act(() => result.current.queryTextWithTextInfo(query));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(dictionaryRequests).toHaveLength(1);
      expect(deferredTranslationRequests).toHaveLength(1);
      expect(result.current.viewSections[0].items[0].service.fromCache).toBe(true);
      expect(buildFavoriteWord(query, result.current.composedContent.services).services).toEqual(favorite.services);
    },
  );

  it("projects streaming chunks and the matching final result without changing the list or item identity", async () => {
    testDoubles.aiQueryCacheMode = "words";
    const nextChunk = createDeferred<void>();
    const finish = createDeferred<void>();
    class StreamingTranslationProvider extends BaseStreamingTranslateProvider {
      type = TranslationType.OpenAI;

      protected async *doTranslate(queryWordInfo: QueryInput): AsyncGenerator<StreamChunk, TranslationContent> {
        yield { content: "part" };
        await nextChunk.promise;
        yield { content: "ial" };
        await finish.promise;
        return { kind: "translation", query: queryWordInfo, paragraphs: ["partial"] };
      }
    }
    const service: TranslationServiceConfig = {
      id: "profile:stream",
      label: "Streaming AI",
      providerKey: "ai:stream",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new StreamingTranslationProvider(),
    };
    const snapshot = { dictionaryServices: [], translationServices: [service] };
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, snapshot));
    const query = createQueryInput("stream");
    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(result.current.viewSections[0]?.items[0].title).toBe("part"));
    const itemId = getListItemId(getDisplaySectionIds(result.current.viewSections, result.current.listEpoch)[0], 0);
    expect(result.current.listEpoch).toBe(1);
    expect(result.current.isLoading).toBe(true);

    await act(async () => nextChunk.resolve());
    await waitFor(() => expect(result.current.viewSections[0].items[0].title).toBe("partial"));
    expect(result.current.isLoading).toBe(true);
    await act(async () => finish.resolve());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.viewSections[0].items[0]).toMatchObject({
      title: "partial",
      copyText: "partial",
    });
    expect(renderSelectedRow(result.current.viewSections[0].items[0], result.current.viewSections)).toBe(
      "**Streaming AI**\n\npartial",
    );
    expect(result.current.listEpoch).toBe(1);
    expect(getListItemId(getDisplaySectionIds(result.current.viewSections, result.current.listEpoch)[0], 0)).toBe(
      itemId,
    );
    expect(getCachedQueryResult(service, query)).toEqual({
      type: TranslationType.OpenAI,
      content: { kind: "translation", query, paragraphs: ["partial"] },
    });
  });

  it("adds providers that load later without restarting dictionary requests", async () => {
    const dynamicService: TranslationServiceConfig = {
      id: "profile:test",
      label: "Test AI",
      providerKey: "ai:test",
      order: 0,
      type: TranslationType.OpenAI,
      icon: { kind: "preset", name: "gemini" },
      enabled: () => true,
      createProvider: () => new RecordingTranslationProvider(),
    };
    const { result, rerender } = renderHook(
      ({ services }: { services: TranslationServiceConfig[] }) =>
        useQueryEngine(englishLanguageItem, {
          translationServices: services,
          dictionaryServices: dictionaryServices,
        }),
      { initialProps: { services: [] as TranslationServiceConfig[] } },
    );

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("incremental"));
    });
    expect(dictionaryRequests).toHaveLength(1);
    expect(translationRequests).toHaveLength(0);

    rerender({ services: [dynamicService] });
    await waitFor(() => expect(translationRequests).toHaveLength(1));
    expect(translationRequests[0].word).toBe("incremental");
    await waitFor(() =>
      expect(
        result.current.viewSections
          .flatMap((section) => section.items)
          .find((item) => item.service.serviceId === dynamicService.id)?.service.serviceIcon,
      ).toEqual({ kind: "preset", name: "gemini" }),
    );
    expect(dictionaryRequests).toHaveLength(1);
    await resolveDictionaryRequest(0);
  });

  it("adds a late dictionary service once without letting it claim automatic audio", async () => {
    const dynamicDictionaryService: DictionaryServiceConfig = {
      id: "profile:test:dictionary",
      label: "Test AI Dictionary",
      providerKey: "ai:test",
      order: 0,
      type: DictionaryType.AI,
      enabled: () => true,
      createProvider: () => new DeferredDictionaryProvider(),
      canTriggerAutomaticAudio: false,
    };
    const { result, rerender } = renderHook(
      ({ dictionaryServices }: { dictionaryServices: DictionaryServiceConfig[] }) =>
        useQueryEngine(englishLanguageItem, {
          translationServices: [],
          dictionaryServices,
        }),
      { initialProps: { dictionaryServices: dictionaryServices } },
    );

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("incremental"));
    });
    expect(dictionaryRequests).toHaveLength(1);

    rerender({ dictionaryServices: [...dictionaryServices, dynamicDictionaryService] });
    await waitFor(() => expect(dictionaryRequests).toHaveLength(2));

    await resolveDictionaryRequest(1);
    expect(testDoubles.playQueryWordAudio).not.toHaveBeenCalled();

    await resolveDictionaryRequest(0);
    await waitFor(() => expect(testDoubles.playQueryWordAudio).toHaveBeenCalledTimes(1));
    expect(dictionaryRequests).toHaveLength(2);
  });

  it("uses a reloaded same-ID configuration for regeneration and the next query without restarting current requests", async () => {
    const originalFactory = vi.fn(() => new DeferredDictionaryProvider());
    const updatedFactory = vi.fn(() => new DeferredDictionaryProvider());
    const originalService: DictionaryServiceConfig = {
      id: "profile:reload:dictionary",
      label: "AI Dictionary",
      providerKey: "ai:reload",
      order: 0,
      type: DictionaryType.AI,
      cacheIdentity: "native-json",
      enabled: () => true,
      createProvider: originalFactory,
      canTriggerAutomaticAudio: false,
    };
    const updatedService: DictionaryServiceConfig = {
      ...originalService,
      cacheIdentity: "prompt-json",
      createProvider: updatedFactory,
    };
    const { result, rerender } = renderHook(
      ({ service }: { service: DictionaryServiceConfig }) =>
        useQueryEngine(englishLanguageItem, {
          translationServices: [],
          dictionaryServices: [service],
        }),
      { initialProps: { service: originalService } },
    );

    act(() => result.current.queryTextWithTextInfo(createQueryInput("first")));
    expect(originalFactory).toHaveBeenCalledTimes(1);
    rerender({ service: updatedService });
    expect(updatedFactory).not.toHaveBeenCalled();
    expect(dictionaryRequests[0].signal?.aborted).toBe(false);
    await resolveDictionaryRequest(0);
    expect(updatedFactory).not.toHaveBeenCalled();

    act(() => result.current.regenerateService(originalService.id));
    expect(updatedFactory).toHaveBeenCalledTimes(1);
    await resolveDictionaryRequest(1);

    act(() => result.current.queryTextWithTextInfo(createQueryInput("second")));
    expect(updatedFactory).toHaveBeenCalledTimes(2);
    expect(originalFactory).toHaveBeenCalledTimes(1);
    await resolveDictionaryRequest(2);
    expect(getDisplayedWord(result.current.viewSections)).toBe("second");
  });

  it("keeps the initial query active through the development Strict Mode effect replay", async () => {
    const detection = createDeferred<DetectionDecision>();
    testDoubles.detectLanguage.mockReturnValueOnce(detection.promise);

    renderHook(
      () => {
        const engine = useQueryEngine(englishLanguageItem, dictionarySnapshot);
        const setupCalled = useRef(false);
        useEffect(() => {
          if (!setupCalled.current) {
            setupCalled.current = true;
            engine.queryText("testimony", "zh-CHS");
          }
        }, []);
        return engine;
      },
      { wrapper: StrictModeWrapper },
    );

    await act(async () => {
      await Promise.resolve();
      detection.resolve(createDetectedLanguage("en"));
      await detection.promise;
    });

    await waitFor(() => {
      expect(dictionaryRequests).toHaveLength(1);
      expect(dictionaryRequests[0].queryWordInfo.word).toBe("testimony");
      expect(dictionaryRequests[0].signal?.aborted).toBe(false);
    });

    await resolveDictionaryRequest(0);
  });

  it("ignores an older language detection that rejects after the current query", async () => {
    const oldDetection = createDeferred<DetectionDecision>();
    const currentDetection = createDeferred<DetectionDecision>();
    testDoubles.detectLanguage.mockReturnValueOnce(oldDetection.promise).mockReturnValueOnce(currentDetection.promise);
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));

    act(() => {
      result.current.queryText("old", "zh-CHS");
      result.current.queryText("current", "zh-CHS");
    });

    await act(async () => {
      currentDetection.resolve(createDetectedLanguage("ja"));
      await currentDetection.promise;
    });

    await waitFor(() => {
      expect(result.current.currentFromLanguageItem.youdaoLangCode).toBe("ja");
      expect(dictionaryRequests).toHaveLength(1);
      expect(dictionaryRequests[0].queryWordInfo.word).toBe("current");
    });

    await act(async () => {
      oldDetection.reject(new Error("cancelled"));
      await oldDetection.promise.catch(() => undefined);
    });

    expect(result.current.currentFromLanguageItem.youdaoLangCode).toBe("ja");
    expect(dictionaryRequests).toHaveLength(1);
    expect(testDoubles.showFailureToast).not.toHaveBeenCalled();

    await resolveDictionaryRequest(0);
  });

  it("keeps the current provider result when an older provider resolves last", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("old"));
      result.current.queryTextWithTextInfo(createQueryInput("current"));
    });

    expect(dictionaryRequests[0].signal?.aborted).toBe(true);
    await resolveDictionaryRequest(1);
    await waitFor(() => expect(getDisplayedWord(result.current.viewSections)).toBe("current"));

    await resolveDictionaryRequest(0);
    expect(getDisplayedWord(result.current.viewSections)).toBe("current");
  });

  it("does not let an older request stop the current loading state", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("old"));
      result.current.queryTextWithTextInfo(createQueryInput("current"));
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await resolveDictionaryRequest(0);
    expect(result.current.isLoading).toBe(true);

    await resolveDictionaryRequest(1);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("keeps results cleared when an old provider resolves after clear", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("old"));
    });
    act(() => {
      result.current.clearQueryResult();
    });

    expect(result.current.viewSections).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await resolveDictionaryRequest(0);
    expect(result.current.viewSections).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("rejects whitespace results without discarding an earlier accepted result", async () => {
    testDoubles.aiQueryCacheMode = "words";
    const whitespaceService: TranslationServiceConfig = {
      id: "profile:whitespace",
      label: "Whitespace AI",
      providerKey: "ai:whitespace",
      order: 0,
      type: TranslationType.OpenAI,
      icon: { kind: "preset", name: "gemini" },
      enabled: () => true,
      createProvider: () => new DeferredTranslationProvider(),
    };
    const { result } = renderHook(() =>
      useQueryEngine(englishLanguageItem, {
        translationServices: [whitespaceService],
        dictionaryServices: [],
      }),
    );

    const query = createQueryInput("whitespace");
    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(1));
    await resolveTranslationRequest(0, " \t\n");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.viewSections).toEqual([]);

    act(() => result.current.regenerateService(whitespaceService.id));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(2));
    await resolveTranslationRequest(1, "accepted");
    const acceptedSections = result.current.viewSections;

    act(() => result.current.regenerateService(whitespaceService.id));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(3));
    await resolveTranslationRequest(2, " \t\n");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.viewSections).toEqual(acceptedSections);
    expect(getCachedQueryResult(whitespaceService, query)).toMatchObject({ content: { paragraphs: ["accepted"] } });
  });

  it("automatically plays each new word when consecutive lookups have the same provider count", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("first"));
    });
    await resolveDictionaryRequest(0);
    await waitFor(() => expect(testDoubles.playQueryWordAudio).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("second"));
    });
    await resolveDictionaryRequest(1);

    await waitFor(() => {
      expect(testDoubles.playQueryWordAudio).toHaveBeenCalledTimes(2);
      expect(testDoubles.playQueryWordAudio).toHaveBeenLastCalledWith(
        expect.objectContaining({ word: "second" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});

function createDeferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function createDetectedLanguage(language: LanguageCode): DetectionDecision {
  return {
    type: LanguageDetectType.Bing,
    language,
    confirmed: true,
  };
}

function createQueryInput(word: string): QueryInput {
  return { word, fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
}

function createDictionaryContent(query: QueryInput): DictionaryContent {
  return { kind: "dictionary", query, sections: [{ kind: "translation", text: query.word }] };
}

function createYoudaoContent(
  query: QueryInput,
  metadata: { phonetic?: string; examTypes?: string[] } = {},
): DictionaryContent {
  return {
    kind: "dictionary",
    query: { ...query, ...metadata },
    sections: [{ kind: "translation", text: "Youdao entry" }],
  };
}

async function resolveDictionaryRequest(index: number) {
  const request = dictionaryRequests[index];
  await act(async () => {
    request.deferred.resolve(createDictionaryContent(request.queryWordInfo));
    await request.deferred.promise;
  });
}

async function resolveTranslationRequest(index: number, translation: string) {
  const request = deferredTranslationRequests[index];
  await act(async () => {
    request.deferred.resolve({
      kind: "translation",
      query: request.queryWordInfo,
      paragraphs: [translation],
    });
    await request.deferred.promise;
  });
}

function getDisplayedWord(sections: ReturnType<typeof useQueryEngine>["viewSections"]): string | undefined {
  return sections[0]?.items[0]?.service.query.word;
}

function StrictModeWrapper({ children }: PropsWithChildren) {
  return createElement(StrictMode, undefined, children);
}

describe("query completion", () => {
  it("preserves the authoritative final completion when chunks differ", async () => {
    testDoubles.aiQueryCacheMode = "words";
    class FinalStreamingProvider extends BaseStreamingTranslateProvider {
      type = TranslationType.OpenAI;
      protected async *doTranslate(queryWordInfo: QueryInput): AsyncGenerator<StreamChunk, TranslationContent> {
        yield { content: "draft" };
        return { kind: "translation", query: queryWordInfo, paragraphs: ["final"] };
      }
    }
    const service: TranslationServiceConfig = {
      id: "profile:final-stream",
      label: "Final Stream",
      providerKey: "ai:final-stream",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new FinalStreamingProvider(),
    };
    const snapshot = { dictionaryServices: [], translationServices: [service] };
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, snapshot));
    const query = createQueryInput("audit");
    act(() => result.current.queryTextWithTextInfo(query));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getCachedQueryResult(service, query)).toMatchObject({ content: { paragraphs: ["final"] } });
    expect(result.current.viewSections[0].items[0].title).toBe("final");
  });

  it("settles loading after current language detection rejects", async () => {
    const detection = createDeferred<DetectionDecision>();
    testDoubles.detectLanguage.mockReturnValueOnce(detection.promise);
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, dictionarySnapshot));
    act(() => result.current.queryText("audit", "zh-CHS"));
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      detection.reject(new Error("detection failure"));
      await detection.promise.catch(() => undefined);
    });
    expect(testDoubles.showFailureToast).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("QueryRunner snapshots", () => {
  function createRunner(services: QueryServiceSnapshot = dictionarySnapshot) {
    return new QueryRunner(englishLanguageItem, services, {
      onError: testDoubles.showFailureToast,
      onAudio: (word, signal) => testDoubles.playQueryWordAudio(word, { signal }),
    });
  }

  it("keeps getSnapshot stable between updates and accepts the final result with settled loading", async () => {
    const service: TranslationServiceConfig = {
      id: "profile:final",
      label: "Final",
      providerKey: "ai:final",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new DeferredTranslationProvider(),
    };
    const runner = createRunner({ translationServices: [service], dictionaryServices: [] });
    expect(runner.getSnapshot()).toBe(runner.getSnapshot());
    const publications: { texts: string[]; loading: boolean }[] = [];
    runner.subscribe(() =>
      publications.push({
        texts: runner
          .getSnapshot()
          .queryResults.flatMap((result) => (result.content.kind === "translation" ? result.content.paragraphs : [])),
        loading: runner.getSnapshot().isLoading,
      }),
    );
    runner.queryTextWithTextInfo(createQueryInput("final"));
    await waitFor(() => expect(deferredTranslationRequests).toHaveLength(1));
    await resolveTranslationRequest(0, "final");
    expect(publications.filter((value) => value.texts.includes("final"))).toEqual([
      { texts: ["final"], loading: false },
    ]);
    expect(runner.getSnapshot()).toBe(runner.getSnapshot());
    runner.dispose();
  });

  it("treats a cached result with another provider identity as a miss", async () => {
    testDoubles.queryCacheMode = "words";
    const query = createQueryInput("identity");
    cacheQueryResult(dictionaryServices[0], query, {
      type: DictionaryType.AI,
      content: {
        kind: "dictionary",
        query,
        sections: [{ kind: "definitions", entries: [{ kind: "plain", text: "wrong provider" }] }],
      },
    });
    const runner = createRunner();
    runner.queryTextWithTextInfo(query);
    expect(dictionaryRequests).toHaveLength(1);
    await resolveDictionaryRequest(0);
    expect(runner.getSnapshot().queryResults[0].content).toEqual(createDictionaryContent(query));
    runner.dispose();
  });

  it("does not accept a cached translation after a synchronous subscriber clears its request", () => {
    testDoubles.aiQueryCacheMode = "words";
    const service: TranslationServiceConfig = {
      id: "profile:cached",
      label: "Cached",
      providerKey: "ai:cached",
      order: 0,
      type: TranslationType.OpenAI,
      enabled: () => true,
      createProvider: () => new RecordingTranslationProvider(),
    };
    const query = createQueryInput("cached");
    cacheQueryResult(service, query, {
      type: service.type,
      content: { kind: "translation", query, paragraphs: ["stale"] },
    });
    const runner = createRunner({ dictionaryServices: [], translationServices: [service] });
    let notifications = 0;
    runner.subscribe(() => {
      if (++notifications === 2) runner.clearQueryResult();
    });
    runner.queryTextWithTextInfo(query);
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
    expect(translationRequests).toHaveLength(0);
    runner.dispose();
  });

  it("normalizes the manifest Filipino alias before starting providers", async () => {
    const runner = createRunner();
    runner.queryTextWithTextInfo({ word: "hello", fromLanguage: "fil", toLanguage: "en" });
    expect(dictionaryRequests[0].queryWordInfo).toMatchObject({ fromLanguage: "tl", toLanguage: "en" });
    await resolveDictionaryRequest(0);
    runner.dispose();
  });

  it("uses automatic target fallback, then preserves a manual target through regeneration", async () => {
    testDoubles.detectLanguage.mockResolvedValue({ type: LanguageDetectType.Bing, language: "tl", confirmed: true });
    const runner = createRunner();
    runner.queryText("kumusta", "fil");
    await waitFor(() => expect(dictionaryRequests).toHaveLength(1));
    expect(dictionaryRequests[0].queryWordInfo).toMatchObject({ fromLanguage: "tl", toLanguage: "en" });
    await resolveDictionaryRequest(0);

    const manualQuery = { word: "kumusta", fromLanguage: "tl", toLanguage: "zh-CHS" };
    runner.queryTextWithTextInfo(manualQuery);
    expect(dictionaryRequests[1].queryWordInfo).toEqual(manualQuery);
    await resolveDictionaryRequest(1);

    runner.regenerateService(dictionaryServices[0].id);
    expect(dictionaryRequests[2].queryWordInfo).toEqual(manualQuery);
    await resolveDictionaryRequest(2);
    expect(testDoubles.detectLanguage).toHaveBeenCalledTimes(1);
    runner.dispose();
  });

  it("rejects unknown query languages without sending requests or leaving loading active", () => {
    const runner = createRunner();
    runner.queryTextWithTextInfo({ word: "hello", fromLanguage: "unknown", toLanguage: "en" });
    expect(dictionaryRequests).toHaveLength(0);
    expect(runner.getSnapshot()).toMatchObject({ isLoading: false, queryResults: [] });
    expect(testDoubles.showFailureToast).toHaveBeenCalledOnce();
    runner.dispose();
  });

  it("settles when every service is disabled", () => {
    const runner = createRunner({
      translationServices: [],
      dictionaryServices: dictionaryServices.map((service) => ({ ...service, enabled: () => false })),
    });
    runner.queryTextWithTextInfo(createQueryInput("disabled"));
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
    expect(dictionaryRequests).toHaveLength(0);
    runner.dispose();
  });

  it("orders independent services with the same type and preserves arrival order for equal ranks", async () => {
    const services = [0, 1, 2].map((index) => ({
      ...dictionaryServices[0],
      id: `dictionary:${index}`,
      order: index === 2 ? -1 : 0,
    }));
    const runner = createRunner({ translationServices: [], dictionaryServices: services });
    runner.queryTextWithTextInfo(createQueryInput("ordered"));
    await resolveDictionaryRequest(1);
    await resolveDictionaryRequest(0);
    expect(runner.getSnapshot().isLoading).toBe(true);
    await resolveDictionaryRequest(2);
    expect(runner.getSnapshot().queryResults.map((result) => result.serviceId)).toEqual([
      "dictionary:2",
      "dictionary:1",
      "dictionary:0",
    ]);
    const completedResults = runner.getSnapshot().queryResults;
    runner.regenerateService("dictionary:1");
    expect(runner.getSnapshot().queryResults).toBe(completedResults);
    await resolveDictionaryRequest(3);
    expect(runner.getSnapshot().queryResults.map((result) => result.serviceId)).toEqual([
      "dictionary:2",
      "dictionary:0",
      "dictionary:1",
    ]);
    expect(runner.getSnapshot().isLoading).toBe(false);
    runner.dispose();
  });

  it("allows a current regeneration to refill a cleared cache while its older request remains ineligible", async () => {
    testDoubles.queryCacheMode = "words";
    const runner = createRunner();
    const query = createQueryInput("refresh");
    runner.queryTextWithTextInfo(query);
    clearQueryCache();
    runner.regenerateService(dictionaryServices[0].id);
    await resolveDictionaryRequest(1);
    expect(getCachedQueryResult(dictionaryServices[0], query)).toMatchObject({ content: { query } });
    const cached = getCachedQueryResult(dictionaryServices[0], query);
    await resolveDictionaryRequest(0);
    expect(getCachedQueryResult(dictionaryServices[0], query)).toEqual(cached);
    runner.dispose();
  });

  it("does not cancel a query when subscribers detach, but disposal suppresses late results and audio", async () => {
    testDoubles.queryCacheMode = "words";
    const runner = createRunner();
    const listener = vi.fn();
    const unsubscribe = runner.subscribe(listener);
    const query = createQueryInput("detached");
    runner.queryTextWithTextInfo(query);
    unsubscribe();
    expect(dictionaryRequests[0].signal?.aborted).toBe(false);
    const lastSnapshot = runner.getSnapshot();
    runner.dispose();
    expect(dictionaryRequests[0].signal?.aborted).toBe(true);
    await resolveDictionaryRequest(0);
    expect(runner.getSnapshot()).toBe(lastSnapshot);
    expect(testDoubles.playQueryWordAudio).not.toHaveBeenCalled();
    expect(testDoubles.showFailureToast).not.toHaveBeenCalled();
    expect(getCachedQueryResult(dictionaryServices[0], query)).toBeUndefined();
  });
});
