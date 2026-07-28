// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren, StrictMode, useEffect, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DetectedLangModel } from "@/core/detect/types";
import { chineseLanguageItem, englishLanguageItem } from "@/core/language/consts";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import { BaseDictionaryProvider } from "@/providers/dictionary/base";
import { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import { DictionaryType, LanguageDetectType } from "@/types/api";
import type { ListDisplayItem } from "@/types/display";
import type { DictionaryResult, QueryInput, RequestOptions } from "@/types/query";

import { useQueryEngine } from "./useQueryEngine";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

interface DictionaryRequest {
  queryWordInfo: QueryInput;
  signal?: AbortSignal;
  deferred: Deferred<DictionaryResult>;
}

const testDoubles = vi.hoisted(() => ({
  detectLanguage: vi.fn(),
  dictionaryServices: [] as DictionaryServiceConfig[],
  playQueryWordAudio: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
}));

vi.mock("@/consts", () => ({
  myPreferences: {
    enableDeepLTranslate: false,
    enableYoudaoDictionary: false,
    enableYoudaoTranslate: false,
    enableLingueeDictionary: true,
    enableAutomaticPlayWordAudio: true,
    flagsAreNotLanguages: false,
  },
}));

vi.mock("@/core/config", () => ({
  config: {
    servicesOrder: [],
    preferredLanguages: [],
  },
}));

vi.mock("@/core/detect", () => ({
  detectLanguage: testDoubles.detectLanguage,
}));

vi.mock("@/core/audio", () => ({
  playQueryWordAudio: testDoubles.playQueryWordAudio,
}));

vi.mock("@/providers/dictionary", () => ({
  dictionaryProviderServices: testDoubles.dictionaryServices,
}));

vi.mock("@/providers/translation", () => ({
  translationServices: [],
}));

vi.mock("@/utils/errors", () => ({
  handleRequestError: (_type: string, error: unknown) => (error instanceof Error ? error : new Error(String(error))),
  showErrorToast: testDoubles.showErrorToast,
}));

vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logSummary: vi.fn(),
  logTrace: vi.fn(),
  logWarn: vi.fn(),
}));

const dictionaryRequests: DictionaryRequest[] = [];

class DeferredDictionaryProvider extends BaseDictionaryProvider {
  type = DictionaryType.Linguee;

  protected doQuery(queryWordInfo: QueryInput, options?: RequestOptions): Promise<DictionaryResult> {
    const deferred = createDeferred<DictionaryResult>();
    dictionaryRequests.push({ queryWordInfo, signal: options?.signal, deferred });
    return deferred.promise;
  }
}

beforeEach(() => {
  dictionaryRequests.length = 0;
  testDoubles.detectLanguage.mockReset();
  testDoubles.playQueryWordAudio.mockReset().mockResolvedValue(undefined);
  testDoubles.showErrorToast.mockReset();
  testDoubles.dictionaryServices.splice(0, testDoubles.dictionaryServices.length, {
    type: DictionaryType.Linguee,
    preference: "enableLingueeDictionary",
    provider: DeferredDictionaryProvider,
    isEnabled: () => true,
  });
});

afterEach(() => {
  cleanup();
});

describe("useQueryEngine query generations", () => {
  it("keeps the initial query active through the development Strict Mode effect replay", async () => {
    const detection = createDeferred<DetectedLangModel>();
    testDoubles.detectLanguage.mockReturnValueOnce(detection.promise);

    renderHook(
      () => {
        const engine = useQueryEngine(englishLanguageItem, chineseLanguageItem);
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
    const oldDetection = createDeferred<DetectedLangModel>();
    const currentDetection = createDeferred<DetectedLangModel>();
    testDoubles.detectLanguage.mockReturnValueOnce(oldDetection.promise).mockReturnValueOnce(currentDetection.promise);
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, chineseLanguageItem));

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
    expect(testDoubles.showErrorToast).not.toHaveBeenCalled();

    await resolveDictionaryRequest(0);
  });

  it("keeps the current provider result when an older provider resolves last", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, chineseLanguageItem));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("old"));
      result.current.queryTextWithTextInfo(createQueryInput("current"));
    });

    expect(dictionaryRequests[0].signal?.aborted).toBe(true);
    await resolveDictionaryRequest(1);
    await waitFor(() => expect(getDisplayedWord(result.current.displaySections)).toBe("current"));

    await resolveDictionaryRequest(0);
    expect(getDisplayedWord(result.current.displaySections)).toBe("current");
  });

  it("does not let an older FINISH_QUERY stop the current loading state", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, chineseLanguageItem));

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
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, chineseLanguageItem));

    act(() => {
      result.current.queryTextWithTextInfo(createQueryInput("old"));
    });
    act(() => {
      result.current.clearQueryResult();
    });

    expect(result.current.displaySections).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    await resolveDictionaryRequest(0);
    expect(result.current.displaySections).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("automatically plays each new word when consecutive lookups have the same provider count", async () => {
    const { result } = renderHook(() => useQueryEngine(englishLanguageItem, chineseLanguageItem));

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

function createDetectedLanguage(youdaoLangCode: string): DetectedLangModel {
  return {
    type: LanguageDetectType.Bing,
    youdaoLangCode,
    sourceLangCode: youdaoLangCode,
    confirmed: true,
  };
}

function createQueryInput(word: string): QueryInput {
  return { word, fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
}

function createDictionaryResult(queryWordInfo: QueryInput): DictionaryResult {
  const item: ListDisplayItem = {
    displayType: LingueeListItemType.Translation,
    queryType: DictionaryType.Linguee,
    queryWordInfo,
    key: queryWordInfo.word,
    title: queryWordInfo.word,
    copyText: queryWordInfo.word,
  };
  return {
    type: DictionaryType.Linguee,
    queryWordInfo,
    result: {},
    displaySections: [{ type: LingueeListItemType.Translation, items: [item] }],
  };
}

async function resolveDictionaryRequest(index: number) {
  const request = dictionaryRequests[index];
  await act(async () => {
    request.deferred.resolve(createDictionaryResult(request.queryWordInfo));
    await request.deferred.promise;
  });
}

function getDisplayedWord(sections: ReturnType<typeof useQueryEngine>["displaySections"]): string | undefined {
  return sections[0]?.items[0]?.queryWordInfo.word;
}

function StrictModeWrapper({ children }: PropsWithChildren) {
  return createElement(StrictMode, undefined, children);
}
