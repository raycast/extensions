// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode, useEffect, useLayoutEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderSelectedRow } from "@/core/content/render";
import type { DictionaryContent, TranslationContent } from "@/core/content/types";
import type { DetectionDecision } from "@/core/detect/types";
import { englishLanguageItem } from "@/core/language/consts";
import { clearQueryCache, getCachedQueryResult } from "@/core/query/cache";
import { getDisplaySectionIds, getListItemId } from "@/core/query/displayIdentities";
import type { QueryServiceSnapshot } from "@/core/query/QueryRunner";
import { DictionaryType, LanguageDetectType, TranslationType } from "@/core/results/kinds";
import type { QueryInput, StreamChunk } from "@/core/results/types";
import { buildFavoriteWord, resolveFavoriteTranslations } from "@/features/favorites/model";
import { favoriteMarkdown } from "@/features/favorites/view";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { BaseStreamingTranslateProvider } from "@/providers/translation/base";
import { createDeferred } from "@/test-support/deferred";
import { createDictionaryContent, createQueryInput, createQueryProviders } from "@/test-support/queryProviders";

import { useQueryEngine } from "./useQueryEngine";

const { preferences, detectLanguage, playQueryWordAudio } = vi.hoisted(() => ({
  preferences: {
    queryCacheMode: "off",
    aiQueryCacheMode: "off",
    enableDeepLTranslate: false,
    enableYoudaoDictionary: false,
    enableYoudaoTranslate: false,
    enableLingueeDictionary: true,
    enableAutomaticPlayWordAudio: true,
    flagsAreNotLanguages: false,
  },
  detectLanguage: vi.fn(),
  playQueryWordAudio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@raycast/api", async () => {
  const { createCacheMock } = await import("@/test-support/raycastStorage");
  return { Cache: createCacheMock(), environment: { isDevelopment: false } };
});
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));
vi.mock("@/consts", () => ({ myPreferences: preferences }));
vi.mock("@/core/config", async () => {
  const { englishLanguageItem, chineseLanguageItem } = await import("@/core/language/consts");
  return { config: { preferredLanguages: [englishLanguageItem, chineseLanguageItem] } };
});
vi.mock("@/core/detect", () => ({ detectLanguage }));
vi.mock("@/core/audio", () => ({ playQueryWordAudio }));

let providers: ReturnType<typeof createQueryProviders>;
let dictionary: DictionaryServiceConfig;

beforeEach(() => {
  preferences.queryCacheMode = "off";
  clearQueryCache();
  detectLanguage.mockReset();
  playQueryWordAudio.mockClear();
  providers = createQueryProviders();
  dictionary = providers.dictionaryService();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function resolveDictionary(index: number, content?: DictionaryContent) {
  const { query, resolve } = providers.dictionaryRequests[index];
  await act(async () => resolve(content ?? createDictionaryContent(query)));
}

async function resolveTranslation(index: number, text: string) {
  const { query, resolve } = providers.translationRequests[index];
  await act(async () => resolve({ kind: "translation", query, paragraphs: [text] }));
}

describe("useQueryEngine lifecycle", () => {
  it("keeps the initial query active through the development Strict Mode effect replay", async () => {
    const detection = createDeferred<DetectionDecision>();
    detectLanguage.mockReturnValueOnce(detection.promise);
    const services = { dictionaryServices: [dictionary], translationServices: [] };
    const { result } = renderHook(
      () => {
        const engine = useQueryEngine(englishLanguageItem, services);
        const started = useRef(false);
        useEffect(() => {
          if (started.current) return;
          started.current = true;
          engine.queryText("testimony", "zh-CHS");
        }, [engine.queryText]);
        return engine;
      },
      { wrapper: StrictMode },
    );

    await act(async () => detection.resolve({ type: LanguageDetectType.Bing, language: "en", confirmed: true }));
    expect(providers.dictionaryRequests).toHaveLength(1);
    expect(providers.dictionaryRequests[0].signal?.aborted).toBe(false);

    await resolveDictionary(0);
    expect(result.current.viewSections[0].items[0].title).toBe("testimony");
  });

  it("aborts an in-flight lookup when the hook unmounts and suppresses late audio and cache writes", async () => {
    preferences.queryCacheMode = "words";
    const services = { dictionaryServices: [dictionary], translationServices: [] };
    const { result, unmount } = renderHook(() => useQueryEngine(englishLanguageItem, services));
    const query = createQueryInput("leaving");
    act(() => result.current.queryTextWithTextInfo(query));
    const request = providers.dictionaryRequests[0];
    expect(request.signal?.aborted).toBe(false);

    await act(async () => unmount());
    expect(request.signal?.aborted).toBe(true);
    await resolveDictionary(0);

    expect(playQueryWordAudio).not.toHaveBeenCalled();
    expect(getCachedQueryResult(dictionary, query)).toBeUndefined();
  });

  it("projects a newly loaded provider without restarting an active dictionary lookup", async () => {
    const dynamicService = providers.translationService({ icon: { kind: "preset", name: "gemini" } });
    const initialServices: QueryServiceSnapshot = { translationServices: [], dictionaryServices: [dictionary] };
    const { result, rerender } = renderHook((services) => useQueryEngine(englishLanguageItem, services), {
      initialProps: initialServices,
    });
    const query = createQueryInput("incremental");
    act(() => result.current.queryTextWithTextInfo(query));
    expect(providers.translationRequests).toHaveLength(0);

    await act(async () => rerender({ ...initialServices, translationServices: [dynamicService] }));
    expect(providers.translationRequests).toHaveLength(1);
    expect(providers.translationRequests[0].query).toEqual(query);
    await resolveTranslation(0, "translated");

    expect(result.current.viewSections.flatMap(({ items }) => items)).toContainEqual(
      expect.objectContaining({
        title: "translated",
        service: expect.objectContaining({
          serviceId: dynamicService.id,
          serviceIcon: { kind: "preset", name: "gemini" },
        }),
      }),
    );
    expect(providers.dictionaryRequests).toHaveLength(1);
    await resolveDictionary(0);
    expect(playQueryWordAudio).toHaveBeenCalledExactlyOnceWith(query, {
      signal: providers.dictionaryRequests[0].signal,
    });
  });
});

describe("useQueryEngine result projection", () => {
  it("removes Linguee's supplemental metadata when regenerated Youdao results no longer supply it", async () => {
    const youdao = providers.dictionaryService({
      type: DictionaryType.Youdao,
      order: 1,
      canTriggerAutomaticAudio: false,
    });
    const services = { dictionaryServices: [dictionary, youdao], translationServices: [] };
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, services));
    const query = createQueryInput("metadata");
    act(() => result.current.queryTextWithTextInfo(query));

    await resolveDictionary(0);
    await resolveDictionary(1, {
      ...createDictionaryContent(query),
      query: { ...query, phonetic: "supplement", examTypes: ["CET4"] },
    });
    expect(result.current.viewSections[0].items[0].accessory).toEqual({
      phonetic: "supplement",
      examTypes: ["CET4"],
    });

    act(() => result.current.regenerateService(youdao.id));
    await resolveDictionary(2);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.viewSections[0].items[0].accessory).toBeUndefined();
  });

  function renderSupplementQuery() {
    const deepL = providers.translationService({
      id: "static:deepl",
      label: TranslationType.DeepL,
      providerKey: "builtin:translation:DeepL",
      order: 1,
      type: TranslationType.DeepL,
    });
    const services = { dictionaryServices: [dictionary], translationServices: [deepL] };
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, services));
    return { result, deepL, query: createQueryInput("word") };
  }

  it("keeps the list stable until a hidden translation can supplement the dictionary and saves the same result on replay", async () => {
    preferences.queryCacheMode = "words";
    const { result, deepL, query } = renderSupplementQuery();
    const previousEpoch = result.current.listEpoch;

    await act(async () => result.current.queryTextWithTextInfo(query));
    expect(result.current.listEpoch).toBe(previousEpoch);
    await resolveTranslation(0, "translated");

    expect(result.current.viewSections).toEqual([]);
    expect(result.current.listEpoch).toBe(previousEpoch);
    expect(result.current.isLoading).toBe(true);
    await resolveDictionary(0);

    const { viewSections, composedContent, listEpoch, isLoading } = result.current;
    expect(isLoading).toBe(false);
    expect(listEpoch).not.toBe(previousEpoch);
    expect(viewSections).toHaveLength(1);
    expect(viewSections[0].items[0]).toMatchObject({ title: "translated", copyText: "translated" });
    expect(renderSelectedRow(viewSections[0].items[0], viewSections)).toBe("**translated**");

    expect(getCachedQueryResult(dictionary, query)).toEqual({
      type: DictionaryType.Linguee,
      content: createDictionaryContent(query),
    });
    expect(getCachedQueryResult(deepL, query)).toEqual({
      type: TranslationType.DeepL,
      content: { kind: "translation", query, paragraphs: ["translated"] },
    });
    const favorite = buildFavoriteWord(query, composedContent.services);
    expect(favoriteMarkdown(favorite)).toContain("**translated**");
    expect(resolveFavoriteTranslations(favorite)).toEqual(["translated"]);

    await act(async () => result.current.queryTextWithTextInfo(query));
    expect(result.current.viewSections[0].items[0].service.fromCache).toBe(true);
    expect(buildFavoriteWord(query, result.current.composedContent.services).services).toEqual(favorite.services);
  });

  it("updates the visible dictionary row without resetting the list when its supplement arrives later", async () => {
    const { result, query } = renderSupplementQuery();
    await act(async () => result.current.queryTextWithTextInfo(query));
    await resolveDictionary(0);

    const visibleEpoch = result.current.listEpoch;
    expect(result.current.viewSections[0].items[0].title).toBe("word");
    expect(result.current.isLoading).toBe(true);

    await resolveTranslation(0, "translated");

    expect(result.current.listEpoch).toBe(visibleEpoch);
    expect(result.current.viewSections[0].items[0].title).toBe("translated");
    expect(result.current.isLoading).toBe(false);
  });

  it("preserves list and item identity in every commit after the first streamed chunk appears", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const nextChunk = createDeferred<void>();
    const finish = createDeferred<void>();
    class StreamingProvider extends BaseStreamingTranslateProvider {
      type = TranslationType.OpenAI;

      protected async *doTranslate(query: QueryInput): AsyncGenerator<StreamChunk, TranslationContent> {
        yield { content: "part" };
        await nextChunk.promise;
        yield { content: "ial" };
        await finish.promise;
        return { kind: "translation", query, paragraphs: ["partial"] };
      }
    }
    const service = providers.translationService({
      label: "Streaming AI",
      createProvider: () => new StreamingProvider(),
    });
    const services = { dictionaryServices: [], translationServices: [service] };
    const commits: { epoch: number; itemId?: string; title?: string; loading: boolean }[] = [];
    const { result } = renderHook(() => {
      const engine = useQueryEngine(englishLanguageItem, services);
      useLayoutEffect(() => {
        const { viewSections, listEpoch, isLoading } = engine;
        const item = viewSections[0]?.items[0];
        const [sectionId] = getDisplaySectionIds(viewSections, listEpoch);
        commits.push({
          epoch: listEpoch,
          itemId: item ? getListItemId(sectionId, 0) : undefined,
          title: item?.title,
          loading: isLoading,
        });
      });
      return engine;
    });

    await act(async () => result.current.queryTextWithTextInfo(createQueryInput("stream")));
    await act(async () => vi.runOnlyPendingTimersAsync());
    const firstChunk = commits.at(-1)!;
    expect(firstChunk).toMatchObject({ title: "part", itemId: expect.any(String), loading: true });
    const firstChunkIndex = commits.length - 1;

    await act(async () => nextChunk.resolve());
    await act(async () => vi.runOnlyPendingTimersAsync());
    expect(commits.at(-1)).toMatchObject({ title: "partial", loading: true });

    await act(async () => finish.resolve());
    expect(commits.at(-1)).toMatchObject({ title: "partial", loading: false });
    for (const commit of commits.slice(firstChunkIndex)) {
      expect(commit).toMatchObject({ epoch: firstChunk.epoch, itemId: firstChunk.itemId });
    }

    const { viewSections } = result.current;
    expect(viewSections[0].items[0]).toMatchObject({ title: "partial", copyText: "partial" });
    expect(renderSelectedRow(viewSections[0].items[0], viewSections)).toBe("**Streaming AI**\n\npartial");
  });
});
