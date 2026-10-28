import { describe, expect, it } from "vitest";

import { DictionaryType, TranslationType } from "@/core/results/kinds";
import type { DictionaryResult, QueryResult, QueryWordInfo, TranslationResult } from "@/core/results/types";

import { composeContent } from "./compose";
import type { DictionarySection } from "./types";

const preferences = { enableDeepLTranslate: false, enableYoudaoDictionary: true, enableYoudaoTranslate: false };
const query = { word: "word", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

function translation(
  type: TranslationType,
  paragraphs = ["translated"],
  info = query,
): QueryResult & TranslationResult {
  return {
    type,
    serviceId: `static:${type}`,
    serviceLabel: type,
    serviceOrder: 10,
    content: { kind: "translation", query: info, paragraphs },
  };
}

function dictionary(
  type: DictionaryType,
  sections: readonly DictionarySection[] = [{ kind: "translation", text: "original" }],
  info: QueryWordInfo = query,
): QueryResult & DictionaryResult {
  return {
    type,
    serviceId: `static:${type}`,
    serviceLabel: type,
    serviceOrder: 1,
    serviceIcon: { kind: "initials" },
    fromCache: true,
    content: { kind: "dictionary", query: info, sections },
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe("composeContent", () => {
  it.each(["source first", "dictionary first"])(
    "uses hidden sources without changing provider content or input order (%s)",
    (order) => {
      const deepL = translation(TranslationType.DeepL, ["first", "second"]);
      const linguee = dictionary(DictionaryType.Linguee);
      const youdao = dictionary(DictionaryType.Youdao, undefined, {
        ...query,
        phonetic: "[word]",
        examTypes: ["CET4"],
      });
      const google = translation(TranslationType.Google);
      const results = freeze(
        order === "source first" ? [deepL, youdao, linguee, google] : [google, linguee, youdao, deepL],
      );
      const original = structuredClone(results);
      const composed = composeContent(results, preferences);
      expect(composed.services.map((service) => service.serviceId)).toEqual(
        results.filter((result) => result !== deepL).map((result) => result.serviceId),
      );
      const supplemented = composed.services.find((service) => service.serviceId === linguee.serviceId)!;
      expect(supplemented).toEqual({
        ...linguee,
        primarySupplement: { translation: "first, second", phonetic: "[word]", examTypes: ["CET4"] },
      });
      expect(supplemented.content).toBe(linguee.content);
      expect(composed.services.find((service) => service.serviceId === google.serviceId)).toBe(google);
      expect(composed.services.find((service) => service.serviceId === youdao.serviceId)).toBe(youdao);
      expect(composed.isShowDetail).toBe(false);
      expect(results).toEqual(original);
    },
  );

  it.each([1, 2])("supplements Youdao only when it has at least two sections (%i)", (count) => {
    const sections: DictionarySection[] = [{ kind: "translation", text: "original" }];
    if (count === 2) sections.push({ kind: "definitions", entries: [] });
    const youdao = dictionary(DictionaryType.Youdao, sections);
    const composed = composeContent([translation(TranslationType.Youdao), youdao], preferences);
    expect(composed.services).toHaveLength(1);
    expect(composed.services[0].primarySupplement).toEqual(count === 2 ? { translation: "translated" } : undefined);
  });

  it.each([
    { phonetic: "only phonetic", examTypes: undefined },
    { phonetic: undefined, examTypes: ["only exams"] },
  ])("keeps both metadata replacement fields when only one is supplied (%j)", (metadata) => {
    const source = dictionary(DictionaryType.Youdao, undefined, { ...query, ...metadata });
    const { services } = composeContent([dictionary(DictionaryType.Linguee), source], preferences);
    expect(services[0].primarySupplement).toStrictEqual(metadata);
    expect(services[0].primarySupplement?.examTypes).toBe(metadata.examTypes);
  });

  it("does not create a supplement for empty translation or metadata", () => {
    const linguee = dictionary(DictionaryType.Linguee);
    const source = dictionary(DictionaryType.Youdao, undefined, { ...query, phonetic: "", examTypes: [] });
    expect(composeContent([translation(TranslationType.DeepL, [""]), source, linguee], preferences).services[1]).toBe(
      linguee,
    );
  });

  it.each([
    ["zh-CHS", 45, false],
    ["zh-CHS", 46, true],
    ["en", 90, false],
    ["en", 91, true],
    ["fr", 91, true],
  ])("uses the detail threshold for hidden translations to %s at length %i", (toLanguage, length, expected) => {
    const source = translation(TranslationType.DeepL, ["x".repeat(length)], { ...query, toLanguage });
    expect(composeContent([source], preferences)).toEqual({ services: [], isShowDetail: expected });
  });

  it("suppresses translation detail when an empty dictionary result is present", () => {
    const source = translation(TranslationType.DeepL, ["x".repeat(100)]);
    const empty = dictionary(DictionaryType.Linguee, []);
    expect(composeContent([source, empty], preferences)).toEqual({
      services: [{ ...empty, primarySupplement: { translation: "x".repeat(100) } }],
      isShowDetail: false,
    });
  });

  it("hides only configured translation services and preserves their supplied order", () => {
    const sources = [
      translation(TranslationType.DeepL),
      translation(TranslationType.Youdao),
      translation(TranslationType.Google),
    ];
    expect(composeContent(sources, preferences).services).toEqual([sources[2]]);
    expect(composeContent(sources, { ...preferences, enableYoudaoDictionary: false }).services).toEqual(
      sources.slice(1),
    );
    expect(composeContent(sources, { ...preferences, enableYoudaoTranslate: true }).services).toEqual(sources.slice(1));
    expect(composeContent(sources, { ...preferences, enableDeepLTranslate: true }).services).toEqual([
      sources[0],
      sources[2],
    ]);
  });
});
