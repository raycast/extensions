import { describe, expect, it, vi } from "vitest";

import { languageItemList } from "@/core/language/consts";
import { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import { DictionaryType, TranslationType } from "@/types/api";
import type { ListDisplayItem } from "@/types/display";
import type { DictionaryQueryResult, TranslationQueryResult } from "@/types/query";

import type { QueryState } from "./queryReducer";
import { queryReducer } from "./queryReducer";

// 1. Mock dependencies
vi.mock("@raycast/api", () => ({
  environment: { isDevelopment: false },
}));

vi.mock("@/consts", () => ({
  myPreferences: {
    enableDeepLTranslate: true,
    enableYoudaoDictionary: true,
    enableYoudaoTranslate: false,
    enableLingueeDictionary: true,
  },
}));

vi.mock("@/core/config", () => ({
  config: { servicesOrder: [] },
}));

const initialState: QueryState = {
  activeGeneration: 0,
  listEpoch: 0,
  queryResults: [],
  queryRecordList: [],
  isLoading: false,
  isShowDetail: false,
  currentFromLanguageItem: languageItemList[2], // English
  autoSelectedTargetLanguageItem: languageItemList[1], // Chinese
};

function createTranslationResult(type: TranslationType, serviceId = `static:${type}`): TranslationQueryResult {
  const queryWordInfo = { word: "test", fromLanguage: "en", toLanguage: "zh-CHS" };
  const displayItem: ListDisplayItem = {
    queryType: type,
    queryWordInfo,
    key: "test-1",
    title: "test",
    copyText: "test",
  };

  return {
    serviceId,
    serviceLabel: type,
    serviceOrder: 0,
    type,
    queryWordInfo,
    result: {},
    translations: ["test"],
    displaySections: [{ type, items: [displayItem] }],
    hideDisplay: false,
  };
}

function createLingueeResult(): DictionaryQueryResult {
  const queryWordInfo = { word: "test", fromLanguage: "en", toLanguage: "zh-CHS" };
  const displayItem: ListDisplayItem = {
    displayType: LingueeListItemType.Translation,
    queryType: DictionaryType.Linguee,
    queryWordInfo,
    key: "test-1",
    title: "test",
    copyText: "test",
  };

  return {
    serviceId: "static:linguee",
    serviceLabel: DictionaryType.Linguee,
    serviceOrder: 0,
    type: DictionaryType.Linguee,
    queryWordInfo,
    result: {},
    displaySections: [{ type: LingueeListItemType.Translation, items: [displayItem] }],
  };
}

describe("queryReducer", () => {
  it("FINISH_QUERY removes only its provider and stops loading only after the final pending provider finishes", () => {
    let state = queryReducer(initialState, { type: "START_QUERY", serviceId: "static:deepl", generation: 0 });
    state = queryReducer(state, { type: "START_QUERY", serviceId: "static:linguee", generation: 0 });
    expect(state.queryRecordList).toEqual(["static:deepl", "static:linguee"]);
    expect(state.isLoading).toBe(true);

    state = queryReducer(state, { type: "FINISH_QUERY", serviceId: "static:deepl", generation: 0 });
    expect(state.queryRecordList).toEqual(["static:linguee"]);
    expect(state.isLoading).toBe(true);

    state = queryReducer(state, { type: "FINISH_QUERY", serviceId: "static:linguee", generation: 0 });
    expect(state.queryRecordList).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("SET_RESULT replaces an earlier result of the same service", () => {
    const result1 = createTranslationResult(TranslationType.DeepL);
    const result2 = createTranslationResult(TranslationType.DeepL);
    result2.translations = ["updated"];

    let state = queryReducer(initialState, { type: "SET_RESULT", queryResult: result1, generation: 0 });
    expect(state.queryResults).toHaveLength(1);
    expect(state.queryResults[0]).toHaveProperty("translations", ["test"]);

    state = queryReducer(state, { type: "SET_RESULT", queryResult: result2, generation: 0 });
    expect(state.queryResults).toHaveLength(1);
    expect(state.queryResults[0]).toHaveProperty("translations", ["updated"]);
  });

  it("keeps independent results and pending records for services with the same semantic type", () => {
    const first = createTranslationResult(TranslationType.OpenAI, "profile:first");
    const second = createTranslationResult(TranslationType.OpenAI, "profile:second");
    second.serviceOrder = 1;

    let state = queryReducer(initialState, { type: "START_QUERY", serviceId: first.serviceId, generation: 0 });
    state = queryReducer(state, { type: "START_QUERY", serviceId: second.serviceId, generation: 0 });
    state = queryReducer(state, { type: "SET_RESULT", queryResult: second, generation: 0 });
    state = queryReducer(state, { type: "SET_RESULT", queryResult: first, generation: 0 });

    expect(state.queryRecordList).toEqual(["profile:first", "profile:second"]);
    expect(state.queryResults.map((result) => result.serviceId)).toEqual(["profile:first", "profile:second"]);

    state = queryReducer(state, { type: "FINISH_QUERY", serviceId: first.serviceId, generation: 0 });
    expect(state.queryRecordList).toEqual(["profile:second"]);
  });

  it("sorts results by global service order across semantic provider types", () => {
    const google = createTranslationResult(TranslationType.Google, "static:google");
    google.serviceOrder = 0;
    const ai = createTranslationResult(TranslationType.OpenAI, "profile:ai");
    ai.serviceOrder = 1;

    let state = queryReducer(initialState, { type: "SET_RESULT", queryResult: ai, generation: 0 });
    state = queryReducer(state, { type: "SET_RESULT", queryResult: google, generation: 0 });

    expect(state.queryResults.map((result) => result.serviceId)).toEqual(["static:google", "profile:ai"]);
  });

  it("a DeepL + Linguee result pair applies the existing title/copy coupling", () => {
    const deepLResult = createTranslationResult(TranslationType.DeepL);
    deepLResult.translations = ["Coupled Translation"];

    const lingueeResult = createLingueeResult();
    lingueeResult.displaySections![0].items[0].title = "Original Linguee Title";
    lingueeResult.displaySections![0].items[0].copyText = "Original Linguee Title";

    let state = queryReducer(initialState, { type: "SET_RESULT", queryResult: deepLResult, generation: 0 });
    state = queryReducer(state, { type: "SET_RESULT", queryResult: lingueeResult, generation: 0 });

    const updatedLinguee = state.queryResults.find((r) => r.type === DictionaryType.Linguee);
    expect(updatedLinguee).toBeDefined();
    expect(updatedLinguee?.displaySections![0].items[0].title).toBe("Coupled Translation");
    expect(updatedLinguee?.displaySections![0].items[0].copyText).toBe("Coupled Translation");
  });

  it("RESET_FOR_NEW_QUERY clears previous results and pending providers, and sets isLoading true", () => {
    let state = queryReducer(initialState, {
      type: "SET_RESULT",
      queryResult: createTranslationResult(TranslationType.DeepL),
      generation: 0,
    });
    state = queryReducer(state, {
      type: "START_QUERY",
      serviceId: "static:google",
      generation: 0,
    });

    state = queryReducer(state, {
      type: "RESET_FOR_NEW_QUERY",
      generation: 1,
    });

    expect(state.queryResults).toEqual([]);
    expect(state.queryRecordList).toEqual([]);
    expect(state.isLoading).toBe(true);
    expect(state.isShowDetail).toBe(false);
    expect(state.activeGeneration).toBe(1);
    expect(state.listEpoch).toBe(0);
  });

  it("CLEAR_ALL empties results and pending providers and resets detail/loading", () => {
    let state = queryReducer(initialState, {
      type: "SET_RESULT",
      queryResult: createTranslationResult(TranslationType.DeepL),
      generation: 0,
    });
    state = queryReducer(state, { type: "START_QUERY", serviceId: "static:google", generation: 0 });

    state = queryReducer(state, { type: "CLEAR_ALL", generation: 2 });
    expect(state.queryResults).toEqual([]);
    expect(state.queryRecordList).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isShowDetail).toBe(false);
    expect(state.activeGeneration).toBe(2);
    expect(state.listEpoch).toBe(0);
  });

  it("changes the native list epoch only when a query first produces a visible item", () => {
    let state = queryReducer(initialState, { type: "RESET_FOR_NEW_QUERY", generation: 1 });
    expect(state.activeGeneration).toBe(1);
    expect(state.listEpoch).toBe(0);

    const hiddenResult = createTranslationResult(TranslationType.DeepL);
    hiddenResult.hideDisplay = true;
    state = queryReducer(state, { type: "SET_RESULT", queryResult: hiddenResult, generation: 1 });
    expect(state.listEpoch).toBe(0);

    const emptyResult = createTranslationResult(TranslationType.OpenAI);
    emptyResult.displaySections = [{ type: TranslationType.OpenAI, items: [] }];
    state = queryReducer(state, { type: "SET_RESULT", queryResult: emptyResult, generation: 1 });
    expect(state.listEpoch).toBe(0);

    state = queryReducer(state, {
      type: "SET_RESULT",
      queryResult: createTranslationResult(TranslationType.Google),
      generation: 1,
    });
    expect(state.listEpoch).toBe(1);

    state = queryReducer(state, {
      type: "SET_RESULT",
      queryResult: createTranslationResult(TranslationType.Bing),
      generation: 1,
    });
    expect(state.listEpoch).toBe(1);

    state = queryReducer(state, { type: "CLEAR_ALL", generation: 2 });
    state = queryReducer(state, { type: "CLEAR_ALL", generation: 3 });
    expect(state.activeGeneration).toBe(3);
    expect(state.listEpoch).toBe(1);

    state = queryReducer(state, { type: "RESET_FOR_NEW_QUERY", generation: 4 });
    expect(state.activeGeneration).toBe(4);
    expect(state.listEpoch).toBe(1);

    state = queryReducer(state, {
      type: "SET_RESULT",
      queryResult: createTranslationResult(TranslationType.Google),
      generation: 4,
    });
    expect(state.listEpoch).toBe(4);
  });

  describe("stale generation behaviors", () => {
    it("stale SET_RESULT cannot change results", () => {
      const state = queryReducer(initialState, { type: "RESET_FOR_NEW_QUERY", generation: 1 });
      const newState = queryReducer(state, {
        type: "SET_RESULT",
        queryResult: createTranslationResult(TranslationType.DeepL),
        generation: 0, // older generation
      });
      expect(newState).toBe(state); // returns same state
      expect(newState.queryResults).toEqual([]);
      expect(newState.listEpoch).toBe(0);
    });

    it("stale FINISH_QUERY cannot remove the active generation's pending provider or stop loading", () => {
      let state = queryReducer(initialState, { type: "RESET_FOR_NEW_QUERY", generation: 1 });
      state = queryReducer(state, { type: "START_QUERY", serviceId: "static:deepl", generation: 1 });

      const newState = queryReducer(state, { type: "FINISH_QUERY", serviceId: "static:deepl", generation: 0 });
      expect(newState).toBe(state);
      expect(newState.queryRecordList).toEqual(["static:deepl"]);
      expect(newState.isLoading).toBe(true);
    });

    it("stale SET_DETECTED_LANGUAGE cannot change displayed languages", () => {
      const state = queryReducer(initialState, { type: "RESET_FOR_NEW_QUERY", generation: 1 });
      const newState = queryReducer(state, {
        type: "SET_DETECTED_LANGUAGE",
        fromLanguageItem: languageItemList[1],
        targetLanguageItem: languageItemList[2],
        generation: 0,
      });
      expect(newState).toBe(state);
    });
  });
});
