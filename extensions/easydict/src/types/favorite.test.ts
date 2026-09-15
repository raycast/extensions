import { describe, expect, it } from "vitest";

import { getStrokeOrderCharacters } from "@/core/stroke-order/characters";
import { AIDictionaryListItemType } from "@/providers/dictionary/ai/types";
import { formatLingueeDisplaySections } from "@/providers/dictionary/linguee/format";
import type { LingueeDictionaryResult } from "@/providers/dictionary/linguee/types";
import { LingueeListItemType } from "@/providers/dictionary/linguee/types";
import { YoudaoDictionaryListItemType } from "@/providers/dictionary/youdao/types";
import { DictionaryType, TranslationType } from "@/types/api";
import type { DisplaySection, ListDisplayItem } from "@/types/display";
import type { QueryWordInfo } from "@/types/query";

import { buildFavoriteWord, type FavoriteWord, resolveFavoriteTranslations } from "./favorite";

const queryWordInfo: QueryWordInfo = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

function makeFavorite(overrides: Partial<FavoriteWord> = {}): FavoriteWord {
  return {
    word: "good",
    fromLanguage: "en",
    toLanguage: "zh-CHS",
    displaySections: [],
    createdAt: 1,
    ...overrides,
  };
}

function dictionaryTranslationSection(
  provider: "youdao" | "linguee" | "ai",
  title: string,
  subtitle = "good",
  wordInfo: QueryWordInfo = queryWordInfo,
): DisplaySection {
  const base = {
    key: `${provider}:${title}`,
    title,
    subtitle,
    // Linguee's copyText mixes the source word into the translation, mirroring
    // its real formatter; the other providers keep copyText and title identical.
    copyText: provider === "linguee" ? `${title} ${subtitle}` : title,
    queryWordInfo: wordInfo,
  };
  const item: ListDisplayItem =
    provider === "youdao"
      ? { ...base, queryType: DictionaryType.Youdao, displayType: YoudaoDictionaryListItemType.Translation }
      : provider === "linguee"
        ? { ...base, queryType: DictionaryType.Linguee, displayType: LingueeListItemType.Translation }
        : { ...base, queryType: DictionaryType.AI, displayType: AIDictionaryListItemType.Translation };
  return { type: item.displayType, items: [item] };
}

function translationSection(text: string): DisplaySection {
  return {
    type: TranslationType.Bing,
    items: [
      {
        queryType: TranslationType.Bing,
        key: `bing:${text}`,
        title: text,
        copyText: text,
        queryWordInfo,
      } satisfies ListDisplayItem,
    ],
  };
}

describe("resolveFavoriteTranslations", () => {
  it("prefers a persisted translations snapshot over derivation", () => {
    const favorite = makeFavorite({
      translations: ["好的"],
      displaySections: [dictionaryTranslationSection("youdao", "良好的")],
    });

    expect(resolveFavoriteTranslations(favorite)).toEqual(["好的"]);
  });

  it("derives the Youdao translation for a dictionary-only favorite", () => {
    const favorite = makeFavorite({ displaySections: [dictionaryTranslationSection("youdao", "良好的")] });

    expect(resolveFavoriteTranslations(favorite)).toEqual(["良好的"]);
  });

  it("uses Linguee's title so the source word never leaks into the translation", () => {
    const favorite = makeFavorite({ displaySections: [dictionaryTranslationSection("linguee", "良好的")] });

    const translations = resolveFavoriteTranslations(favorite);
    expect(translations).toEqual(["良好的"]);
    expect(translations?.join("\n")).not.toContain("good");
  });

  it("prefers a real translation section when both kinds are present", () => {
    const favorite = makeFavorite({
      displaySections: [dictionaryTranslationSection("youdao", "良好的"), translationSection("很好，不错")],
    });

    expect(resolveFavoriteTranslations(favorite)).toEqual(["很好，不错"]);
  });

  it("returns undefined when no translation exists", () => {
    expect(resolveFavoriteTranslations(makeFavorite())).toBeUndefined();
  });

  it("ignores a legacy Linguee word-placeholder Translation section", () => {
    // Persisted fixture from the old formatter: no exact word entry was
    // represented by a Translation item whose title was the query word.
    const favorite = makeFavorite({ displaySections: [dictionaryTranslationSection("linguee", "good")] });

    expect(favorite.displaySections[0]).toMatchObject({
      type: LingueeListItemType.Translation,
      items: [{ title: "good" }],
    });
    expect(resolveFavoriteTranslations(favorite)).toBeUndefined();
  });

  it("continues past a Linguee placeholder to another provider's real translation", () => {
    const result: LingueeDictionaryResult = {
      wordItems: [],
      examples: [{ example: { text: "a good book", pos: "" }, translations: [{ text: "一本好书", pos: "" }] }],
      relatedWords: [],
      wikipedias: [],
    };
    const favorite = makeFavorite({
      displaySections: [
        ...formatLingueeDisplaySections(queryWordInfo, result),
        dictionaryTranslationSection("youdao", "良好的"),
      ],
    });

    expect(resolveFavoriteTranslations(favorite)).toEqual(["良好的"]);
  });

  it("accepts a same-text translation from a non-Linguee provider", () => {
    // Proper nouns like brand names can legitimately keep their form in the
    // target language; only Linguee's placeholder title must be skipped.
    const nikeInfo: QueryWordInfo = { word: "Nike", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
    const favorite = makeFavorite({
      word: "Nike",
      displaySections: [dictionaryTranslationSection("ai", "Nike", "Nike", nikeInfo)],
    });

    expect(resolveFavoriteTranslations(favorite)).toEqual(["Nike"]);
  });
});

describe("buildFavoriteWord", () => {
  it("persists a fallback translation for dictionary-only results", () => {
    const favorite = buildFavoriteWord(queryWordInfo, [dictionaryTranslationSection("youdao", "良好的")]);

    expect(favorite.translations).toEqual(["良好的"]);
  });
});

describe("stroke order integration", () => {
  it("an en→zh legacy favorite still exposes stroke order from the fallback translation", () => {
    const favorite = makeFavorite({ displaySections: [dictionaryTranslationSection("youdao", "良好")] });
    const translations = resolveFavoriteTranslations(favorite);

    expect(
      getStrokeOrderCharacters({
        fromLanguage: favorite.fromLanguage,
        toLanguage: favorite.toLanguage,
        sourceText: favorite.word,
        translatedText: translations?.join("\n") ?? "",
      }),
    ).toEqual(["良", "好"]);
  });

  it("a zh→en favorite keeps extracting hanzi from the source word, ignoring the fallback translation", () => {
    const favorite = makeFavorite({
      word: "学习",
      fromLanguage: "zh-CHS",
      toLanguage: "en",
      displaySections: [dictionaryTranslationSection("ai", "study")],
    });
    const translations = resolveFavoriteTranslations(favorite);
    expect(translations).toEqual(["study"]);

    expect(
      getStrokeOrderCharacters({
        fromLanguage: favorite.fromLanguage,
        toLanguage: favorite.toLanguage,
        sourceText: favorite.word,
        translatedText: translations?.join("\n") ?? "",
      }),
    ).toEqual(["学", "习"]);
  });
});
