import { describe, expect, it } from "vitest";

import type { ComposedService } from "@/core/content/compose";
import { DictionaryType, TranslationType } from "@/core/results/kinds";
import { getStrokeOrderCharacters } from "@/core/stroke-order/characters";

import { decodeFavoriteSnapshot } from "./decode";
import { buildFavoriteWord, favoriteKeyOf, resolveFavoriteTranslations } from "./model";
import { favoriteMarkdown, getFavoriteView } from "./view";

const query = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
const dictionary: ComposedService = {
  type: DictionaryType.Youdao,
  serviceId: "youdao",
  serviceLabel: "Saved Youdao",
  serviceOrder: 4,
  serviceIcon: { kind: "initials" },
  content: { kind: "dictionary", query, sections: [{ kind: "translation", text: "良好\n好的" }] },
};

describe("favorite snapshots", () => {
  it("saves composed content and metadata while omitting runtime state and fresh preview copies", () => {
    const service = {
      ...dictionary,
      fromCache: true,
      requestId: "runtime",
      primarySupplement: { translation: "很好", phonetic: "gʊd", examTypes: ["CET4"] },
    };
    const favorite = buildFavoriteWord(query, [service]);
    const wire = JSON.stringify(favorite);
    expect(wire).not.toContain("fromCache");
    expect(wire).not.toContain("requestId");
    expect(wire).not.toContain("legacyPreview");
    const restored = decodeFavoriteSnapshot(JSON.parse(wire));
    expect(restored.services[0]).toMatchObject({
      serviceId: "youdao",
      serviceLabel: "Saved Youdao",
      serviceOrder: 4,
      serviceIcon: { kind: "initials" },
      primarySupplement: { translation: "很好", phonetic: "gʊd", examTypes: ["CET4"] },
    });
    expect(resolveFavoriteTranslations(restored)).toEqual(["很好"]);
    expect(favoriteMarkdown(restored)).toContain("Saved Youdao");
    expect(getFavoriteView(restored)[0].items[0].accessory).toEqual({ phonetic: "gʊd", examTypes: ["CET4"] });
    expect(dictionary.content).toMatchObject({ sections: [{ text: "良好\n好的" }] });
  });

  it("prefers machine translation paragraphs over dictionary titles and preserves paragraph boundaries", () => {
    const translation: ComposedService = {
      type: TranslationType.Bing,
      serviceId: "bing",
      serviceLabel: "Bing",
      serviceOrder: 5,
      content: { kind: "translation", query, paragraphs: [" 很好 ", "", "不错\n优秀"] },
    };
    const favorite = buildFavoriteWord(query, [dictionary, translation]);
    expect(resolveFavoriteTranslations(favorite)).toEqual(["很好", "不错", "优秀"]);
    expect(getFavoriteView(favorite)[1].items[0].copyText).toBe(" 很好 \n\n不错\n优秀");
    expect(favorite.services.map((service) => service.serviceId)).toEqual(["youdao", "bing"]);
  });

  it("derives dictionary previews from display titles without source-word copy suffixes", () => {
    const linguee: ComposedService = {
      type: DictionaryType.Linguee,
      serviceId: "linguee",
      serviceLabel: "Linguee",
      serviceOrder: 0,
      content: { kind: "dictionary", query, sections: [{ kind: "translation", text: "良好", lemma: "good" }] },
    };
    expect(resolveFavoriteTranslations(buildFavoriteWord(query, [dictionary]))).toEqual(["良好, 好的"]);
    const favorite = buildFavoriteWord(query, [linguee]);
    expect(resolveFavoriteTranslations(favorite)).toEqual(["良好"]);
    expect(getFavoriteView(favorite)[0].items[0].copyText).toBe("良好 good");
    expect(
      getStrokeOrderCharacters({
        ...query,
        sourceText: query.word,
        translatedText: resolveFavoriteTranslations(favorite)?.join("\n") ?? "",
      }),
    ).toEqual(["良", "好"]);
  });

  it("falls back to a dictionary when the first machine translation is empty", () => {
    const translation: ComposedService = {
      type: TranslationType.Bing,
      serviceId: "first",
      serviceLabel: "First",
      serviceOrder: 0,
      content: { kind: "translation", query, paragraphs: [] },
    };
    const later: ComposedService = {
      ...translation,
      serviceId: "later",
      serviceLabel: "Later",
      serviceOrder: 1,
      content: { kind: "translation", query, paragraphs: ["later translation"] },
    };
    expect(resolveFavoriteTranslations(buildFavoriteWord(query, [translation, later, dictionary]))).toEqual([
      "良好, 好的",
    ]);
  });

  it("does not turn a supplemented example-only dictionary into a translation preview", () => {
    const service: ComposedService = {
      type: DictionaryType.Linguee,
      serviceId: "linguee",
      serviceLabel: "Linguee",
      serviceOrder: 0,
      content: {
        kind: "dictionary",
        query,
        sections: [{ kind: "examples", entries: [{ sentence: "good day", translation: "好日子" }] }],
      },
      primarySupplement: { translation: "良好" },
    };
    expect(getFavoriteView(buildFavoriteWord(query, [service]))[0].items[0].title).toBe("良好");
    expect(resolveFavoriteTranslations(buildFavoriteWord(query, [service]))).toBeUndefined();
  });

  it("keeps direction in favorite identity and allows a favorite without body or preview", () => {
    expect(favoriteKeyOf(query)).not.toBe(favoriteKeyOf({ ...query, toLanguage: "fr" }));
    const favorite = decodeFavoriteSnapshot({ query, services: [], createdAt: 1, legacyPreview: [] });
    expect(resolveFavoriteTranslations(favorite)).toBeUndefined();
    expect(favoriteMarkdown(favorite)).toContain("## 𝐠𝐨𝐨𝐝");
  });
});
