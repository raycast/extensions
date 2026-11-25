import { setImmediate as nextTurn } from "node:timers/promises";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TranslationContent } from "@/core/content/types";
import type { DetectionDecision } from "@/core/detect/types";
import { englishLanguageItem } from "@/core/language/consts";
import { DictionaryType, LanguageDetectType, TranslationType } from "@/core/results/kinds";
import type { QueryInput, QueryWordInfo, StreamChunk } from "@/core/results/types";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { BaseStreamingTranslateProvider } from "@/providers/translation/base";
import { createDeferred } from "@/test-support/deferred";
import { createDictionaryContent, createQueryInput, createQueryProviders } from "@/test-support/queryProviders";

import { cacheQueryResult, clearQueryCache, getCachedQueryResult } from "./cache";
import { QueryRunner } from "./QueryRunner";

const { preferences, detectLanguage } = vi.hoisted(() => ({
  preferences: {
    queryCacheMode: "off",
    aiQueryCacheMode: "off",
    enableAutomaticPlayWordAudio: true,
  },
  detectLanguage: vi.fn(),
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

const onError = vi.fn<(error: unknown) => void>();
const onAudio = vi.fn<(word: QueryWordInfo, signal: AbortSignal) => void>();
let runner: QueryRunner;
let providers: ReturnType<typeof createQueryProviders>;
let dictionary: DictionaryServiceConfig;

beforeEach(() => {
  preferences.queryCacheMode = "off";
  preferences.aiQueryCacheMode = "off";
  clearQueryCache();
  detectLanguage.mockReset();
  onError.mockClear();
  onAudio.mockClear();
  providers = createQueryProviders();
  dictionary = providers.dictionaryService();
  runner = new QueryRunner(
    englishLanguageItem,
    { dictionaryServices: [dictionary], translationServices: [] },
    { onError, onAudio },
  );
});
afterEach(() => {
  runner.dispose();
  vi.useRealTimers();
});

async function resolveDictionary(index: number, text?: string) {
  const { query, resolve } = providers.dictionaryRequests[index];
  const content = createDictionaryContent(query);
  resolve(text === undefined ? content : { ...content, sections: [{ kind: "translation", text }] });
  await nextTurn();
}

async function resolveTranslation(index: number, text: string) {
  const { query, resolve } = providers.translationRequests[index];
  resolve({ kind: "translation", query, paragraphs: [text] });
  await nextTurn();
}

describe("query ownership", () => {
  it("ignores an older language detection that rejects after the current query", async () => {
    const oldDetection = createDeferred<DetectionDecision>();
    const currentDetection = createDeferred<DetectionDecision>();
    detectLanguage.mockReturnValueOnce(oldDetection.promise).mockReturnValueOnce(currentDetection.promise);

    runner.queryText("old", "zh-CHS");
    runner.queryText("current", "zh-CHS");
    currentDetection.resolve({ type: LanguageDetectType.Bing, language: "ja", confirmed: true });
    await nextTurn();

    expect(runner.getSnapshot().currentFromLanguageItem.youdaoLangCode).toBe("ja");
    expect(providers.dictionaryRequests).toHaveLength(1);
    expect(providers.dictionaryRequests[0].query.word).toBe("current");

    oldDetection.reject(new Error("late detection failure"));
    await nextTurn();

    expect(runner.getSnapshot().currentFromLanguageItem.youdaoLangCode).toBe("ja");
    expect(runner.getSnapshot().isLoading).toBe(true);
    expect(providers.dictionaryRequests).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
    await resolveDictionary(0);
  });

  it("settles loading and reports the error when current language detection rejects", async () => {
    const detection = createDeferred<DetectionDecision>();
    const error = new Error("detection failure");
    detectLanguage.mockReturnValueOnce(detection.promise);
    runner.queryText("audit", "zh-CHS");
    expect(runner.getSnapshot().isLoading).toBe(true);

    detection.reject(error);
    await nextTurn();

    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
  });

  it.each(["old first", "current first"] as const)(
    "keeps the current result and loading state when overlapping queries complete %s",
    async (order) => {
      const oldQuery = createQueryInput("old");
      const currentQuery = createQueryInput("current");
      runner.queryTextWithTextInfo(oldQuery);
      runner.queryTextWithTextInfo(currentQuery);

      expect(providers.dictionaryRequests[0].signal?.aborted).toBe(true);
      if (order === "old first") {
        await resolveDictionary(0);
        expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: true });
        await resolveDictionary(1);
      } else {
        await resolveDictionary(1);
        expect(runner.getSnapshot().isLoading).toBe(false);
        await resolveDictionary(0);
      }

      expect(runner.getSnapshot().isLoading).toBe(false);
      expect(runner.getSnapshot().queryResults.map(({ content }) => content.query)).toEqual([currentQuery]);
    },
  );

  it("keeps results cleared when an old provider resolves after clear", async () => {
    runner.queryTextWithTextInfo(createQueryInput("old"));
    runner.clearQueryResult();
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });

    await resolveDictionary(0);

    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
  });

  it("keeps only the latest regeneration when same-service requests finish out of order", async () => {
    preferences.aiQueryCacheMode = "words";
    const service = providers.translationService();
    runner.setServices({ translationServices: [service], dictionaryServices: [] });
    const query = createQueryInput("generate");

    runner.queryTextWithTextInfo(query);
    await nextTurn();
    runner.regenerateService(service.id);
    await nextTurn();
    runner.regenerateService(service.id);
    await nextTurn();

    expect(providers.translationRequests.map(({ signal }) => signal?.aborted)).toEqual([true, true, false]);
    await resolveTranslation(2, "latest");
    expect(runner.getSnapshot().isLoading).toBe(false);
    expect(runner.getSnapshot().queryResults[0].content).toMatchObject({ paragraphs: ["latest"] });

    await resolveTranslation(1, "middle");
    await resolveTranslation(0, "oldest");
    expect(runner.getSnapshot().queryResults[0].content).toMatchObject({ paragraphs: ["latest"] });
    expect(getCachedQueryResult(service, query)).toMatchObject({ content: { paragraphs: ["latest"] } });
  });

  it("keeps requests alive when subscribers detach and suppresses late effects after disposal", async () => {
    preferences.queryCacheMode = "words";
    const listener = vi.fn();
    const unsubscribe = runner.subscribe(listener);
    const query = createQueryInput("detached");
    runner.queryTextWithTextInfo(query);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    expect(providers.dictionaryRequests[0].signal?.aborted).toBe(false);

    const lastSnapshot = runner.getSnapshot();
    runner.dispose();
    expect(providers.dictionaryRequests[0].signal?.aborted).toBe(true);
    await resolveDictionary(0);

    expect(runner.getSnapshot()).toBe(lastSnapshot);
    expect(onAudio).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(getCachedQueryResult(dictionary, query)).toBeUndefined();
  });
});

describe("query cache", () => {
  it("reuses a completed cached dictionary result unless the user explicitly requeries", async () => {
    preferences.queryCacheMode = "words";
    const query = createQueryInput("cached");
    runner.queryTextWithTextInfo(query);
    await resolveDictionary(0);

    runner.queryTextWithTextInfo(query);

    expect(runner.getSnapshot()).toMatchObject({ queryResults: [{ fromCache: true }], isLoading: false });
    expect(providers.dictionaryRequests).toHaveLength(1);

    runner.queryTextWithTextInfo(query, { bypassCache: true });
    expect(providers.dictionaryRequests).toHaveLength(2);
    await resolveDictionary(1, "fresh");
    expect(runner.getSnapshot().queryResults[0]).toMatchObject({
      fromCache: false,
      content: { sections: [{ kind: "translation", text: "fresh" }] },
    });
  });

  it("regenerates only the selected AI service even when its completed result is cached", async () => {
    preferences.aiQueryCacheMode = "words";
    const service = providers.translationService();
    runner.setServices({ translationServices: [service], dictionaryServices: [dictionary] });
    const query = createQueryInput("generate");

    runner.queryTextWithTextInfo(query);
    await resolveDictionary(0);
    await resolveTranslation(0, "original");
    expect(runner.getSnapshot().isLoading).toBe(false);

    runner.queryTextWithTextInfo(query);
    await resolveDictionary(1);
    expect(runner.getSnapshot().queryResults).toContainEqual(
      expect.objectContaining({ serviceId: service.id, fromCache: true }),
    );
    expect(providers.translationRequests).toHaveLength(1);

    runner.regenerateService(service.id);
    await nextTurn();
    expect(providers.translationRequests).toHaveLength(2);
    expect(providers.dictionaryRequests).toHaveLength(2);
    await resolveTranslation(1, "regenerated");
    expect(getCachedQueryResult(service, query)).toMatchObject({ content: { paragraphs: ["regenerated"] } });
  });

  it("treats a cached result with another provider identity as a miss", async () => {
    preferences.queryCacheMode = "words";
    const query = createQueryInput("identity");
    cacheQueryResult(dictionary, query, {
      type: DictionaryType.AI,
      content: createDictionaryContent(query),
    });
    runner.queryTextWithTextInfo(query);
    expect(providers.dictionaryRequests).toHaveLength(1);
    await resolveDictionary(0);
    expect(runner.getSnapshot().queryResults[0]).toMatchObject({ type: DictionaryType.Linguee, fromCache: false });
  });

  it("does not accept a cached translation after a synchronous subscriber clears its request", () => {
    preferences.aiQueryCacheMode = "words";
    const service = providers.translationService();
    const query = createQueryInput("cached");
    cacheQueryResult(service, query, {
      type: service.type,
      content: { kind: "translation", query, paragraphs: ["stale"] },
    });
    runner.setServices({ dictionaryServices: [], translationServices: [service] });
    let notifications = 0;
    runner.subscribe(() => {
      if (++notifications === 2) runner.clearQueryResult();
    });

    runner.queryTextWithTextInfo(query);

    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
    expect(providers.translationRequests).toHaveLength(0);
  });

  it("publishes a result that finishes after a cache clear without repopulating the cache", async () => {
    preferences.queryCacheMode = "words";
    const query = createQueryInput("pending");
    runner.queryTextWithTextInfo(query);
    clearQueryCache();

    await resolveDictionary(0);

    expect(runner.getSnapshot().queryResults[0].content).toEqual(createDictionaryContent(query));
    expect(getCachedQueryResult(dictionary, query)).toBeUndefined();
  });

  it("allows a current regeneration to refill a cleared cache while its older request remains ineligible", async () => {
    preferences.queryCacheMode = "words";
    const query = createQueryInput("refresh");
    runner.queryTextWithTextInfo(query);
    clearQueryCache();
    runner.regenerateService(dictionary.id);
    await resolveDictionary(1, "regenerated");
    await resolveDictionary(0, "stale");

    expect(getCachedQueryResult(dictionary, query)).toMatchObject({
      content: { sections: [{ kind: "translation", text: "regenerated" }] },
    });
  });
});

describe("query results and services", () => {
  it("publishes streamed text while loading and caches only the final completion", async () => {
    preferences.aiQueryCacheMode = "words";
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const finish = createDeferred<void>();
    class FinalStreamingProvider extends BaseStreamingTranslateProvider {
      type = TranslationType.OpenAI;
      protected async *doTranslate(query: QueryInput): AsyncGenerator<StreamChunk, TranslationContent> {
        yield { content: "draft" };
        await finish.promise;
        return { kind: "translation", query, paragraphs: ["final"] };
      }
    }
    const service = providers.translationService({ createProvider: () => new FinalStreamingProvider() });
    runner.setServices({ dictionaryServices: [], translationServices: [service] });
    const query = createQueryInput("audit");
    const initial = runner.getSnapshot();
    expect(runner.getSnapshot()).toBe(initial);
    const publications: ReturnType<QueryRunner["getSnapshot"]>[] = [];
    runner.subscribe(() => publications.push(runner.getSnapshot()));

    runner.queryTextWithTextInfo(query);
    await nextTurn();
    await vi.runOnlyPendingTimersAsync();
    expect(getCachedQueryResult(service, query)).toBeUndefined();

    finish.resolve();
    await nextTurn();

    expect(publications.filter(({ queryResults }) => queryResults.length > 0)).toMatchObject([
      { isLoading: true, queryResults: [{ content: { paragraphs: ["draft"] } }] },
      { isLoading: false, queryResults: [{ content: { paragraphs: ["final"] } }] },
    ]);
    expect(runner.getSnapshot()).toBe(publications.at(-1));
    expect(getCachedQueryResult(service, query)).toMatchObject({ content: { paragraphs: ["final"] } });
  });

  it("rejects whitespace results without discarding or overwriting an earlier accepted result", async () => {
    preferences.aiQueryCacheMode = "words";
    const service = providers.translationService();
    runner.setServices({ translationServices: [service], dictionaryServices: [] });
    const query = createQueryInput("whitespace");
    runner.queryTextWithTextInfo(query);
    await nextTurn();
    await resolveTranslation(0, " \t\n");
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
    expect(getCachedQueryResult(service, query)).toBeUndefined();

    runner.regenerateService(service.id);
    await nextTurn();
    await resolveTranslation(1, "accepted");
    const accepted = runner.getSnapshot().queryResults;

    runner.regenerateService(service.id);
    await nextTurn();
    await resolveTranslation(2, " \t\n");

    expect(runner.getSnapshot().isLoading).toBe(false);
    expect(runner.getSnapshot().queryResults).toEqual(accepted);
    expect(getCachedQueryResult(service, query)).toMatchObject({ content: { paragraphs: ["accepted"] } });
  });

  it("adds a late dictionary service once without letting it claim automatic audio", async () => {
    const lateDictionary = providers.dictionaryService({
      type: DictionaryType.AI,
      canTriggerAutomaticAudio: false,
    });
    const snapshot = { dictionaryServices: [dictionary, lateDictionary], translationServices: [] };
    runner.queryTextWithTextInfo(createQueryInput("incremental"));

    runner.setServices(snapshot);
    runner.setServices(snapshot);
    expect(providers.dictionaryRequests).toHaveLength(2);
    await resolveDictionary(1);
    expect(onAudio).not.toHaveBeenCalled();

    await resolveDictionary(0);
    expect(onAudio).toHaveBeenCalledOnce();
  });

  it("uses a reloaded same-ID configuration for regeneration and the next query without restarting current requests", async () => {
    const originalFactory = vi.fn(dictionary.createProvider);
    const updatedFactory = vi.fn(dictionary.createProvider);
    const originalService = { ...dictionary, cacheIdentity: "native-json", createProvider: originalFactory };
    const updatedService = { ...originalService, cacheIdentity: "prompt-json", createProvider: updatedFactory };
    runner.setServices({ dictionaryServices: [originalService], translationServices: [] });
    runner.queryTextWithTextInfo(createQueryInput("first"));

    runner.setServices({ dictionaryServices: [updatedService], translationServices: [] });
    expect(updatedFactory).not.toHaveBeenCalled();
    expect(providers.dictionaryRequests[0].signal?.aborted).toBe(false);
    await resolveDictionary(0);
    expect(updatedFactory).not.toHaveBeenCalled();

    runner.regenerateService(originalService.id);
    expect(updatedFactory).toHaveBeenCalledTimes(1);
    await resolveDictionary(1);

    const second = createQueryInput("second");
    runner.queryTextWithTextInfo(second);
    expect(updatedFactory).toHaveBeenCalledTimes(2);
    expect(originalFactory).toHaveBeenCalledOnce();
    await resolveDictionary(2);
    expect(runner.getSnapshot().queryResults[0].content.query).toEqual(second);
  });

  it("orders independent services with the same type and preserves arrival order for equal ranks", async () => {
    const services = [0, 1, 2].map((index) =>
      providers.dictionaryService({ id: `dictionary:${index}`, order: index === 2 ? -1 : 0 }),
    );
    runner.setServices({ translationServices: [], dictionaryServices: services });
    runner.queryTextWithTextInfo(createQueryInput("ordered"));
    await resolveDictionary(1);
    await resolveDictionary(0);
    expect(runner.getSnapshot().isLoading).toBe(true);
    await resolveDictionary(2);
    expect(runner.getSnapshot().queryResults.map((result) => result.serviceId)).toEqual([
      "dictionary:2",
      "dictionary:1",
      "dictionary:0",
    ]);

    const completed = runner.getSnapshot().queryResults;
    runner.regenerateService("dictionary:1");
    expect(runner.getSnapshot().queryResults).toBe(completed);
    await resolveDictionary(3);

    expect(runner.getSnapshot().queryResults.map((result) => result.serviceId)).toEqual([
      "dictionary:2",
      "dictionary:0",
      "dictionary:1",
    ]);
    expect(runner.getSnapshot().isLoading).toBe(false);
  });

  it("automatically plays each new word when consecutive lookups have the same provider count", async () => {
    runner.queryTextWithTextInfo(createQueryInput("first"));
    await resolveDictionary(0);
    runner.queryTextWithTextInfo(createQueryInput("second"));
    await resolveDictionary(1);

    expect(onAudio.mock.calls.map(([word]) => word.word)).toEqual(["first", "second"]);
    expect(onAudio).toHaveBeenLastCalledWith(
      expect.objectContaining({ word: "second" }),
      providers.dictionaryRequests[1].signal,
    );
  });
});

describe("query languages", () => {
  it("normalizes the manifest Filipino alias before starting providers", async () => {
    runner.queryTextWithTextInfo({ word: "hello", fromLanguage: "fil", toLanguage: "en" });
    expect(providers.dictionaryRequests[0].query).toMatchObject({ fromLanguage: "tl", toLanguage: "en" });
    await resolveDictionary(0);
  });

  it("uses automatic target fallback, then preserves a manual target through regeneration", async () => {
    detectLanguage.mockResolvedValue({ type: LanguageDetectType.Bing, language: "tl", confirmed: true });
    runner.queryText("kumusta", "fil");
    await nextTurn();
    expect(providers.dictionaryRequests[0].query).toMatchObject({ fromLanguage: "tl", toLanguage: "en" });
    await resolveDictionary(0);

    const manualQuery = { word: "kumusta", fromLanguage: "tl", toLanguage: "zh-CHS" };
    runner.queryTextWithTextInfo(manualQuery);
    expect(providers.dictionaryRequests[1].query).toEqual(manualQuery);
    await resolveDictionary(1);

    runner.regenerateService(dictionary.id);
    expect(providers.dictionaryRequests[2].query).toEqual(manualQuery);
    await resolveDictionary(2);
    expect(detectLanguage).toHaveBeenCalledOnce();
  });

  it("rejects unknown query languages without sending requests or leaving loading active", () => {
    runner.queryTextWithTextInfo({ word: "hello", fromLanguage: "unknown", toLanguage: "en" });
    expect(providers.dictionaryRequests).toHaveLength(0);
    expect(runner.getSnapshot()).toMatchObject({ isLoading: false, queryResults: [] });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("settles when every service is disabled", () => {
    runner.setServices({
      translationServices: [],
      dictionaryServices: [{ ...dictionary, enabled: () => false }],
    });
    runner.queryTextWithTextInfo(createQueryInput("disabled"));
    expect(runner.getSnapshot()).toMatchObject({ queryResults: [], isLoading: false });
    expect(providers.dictionaryRequests).toHaveLength(0);
  });
});
