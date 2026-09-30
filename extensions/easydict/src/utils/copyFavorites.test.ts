import { describe, expect, it } from "vitest";

import type { FavoriteWord } from "@/types/favorite";

import { copyAllText } from "./copyFavorites";

function makeFavorite(overrides: Partial<FavoriteWord> = {}): FavoriteWord {
  return {
    word: "serendipity",
    fromLanguage: "en",
    toLanguage: "zh-CHS",
    isWord: true,
    translations: ["机缘巧合"],
    displaySections: [],
    createdAt: 1722864000000,
    ...overrides,
  };
}

describe("copyAllText", () => {
  it("joins word and translation with a tab", () => {
    expect(copyAllText([makeFavorite()])).toBe("serendipity\t机缘巧合");
  });

  it("joins multiple translations with a comma", () => {
    expect(copyAllText([makeFavorite({ translations: ["机缘巧合", "意外发现"] })])).toBe(
      "serendipity\t机缘巧合, 意外发现",
    );
  });

  it("leaves an empty translation column when translations are absent", () => {
    expect(copyAllText([makeFavorite({ translations: undefined })])).toBe("serendipity\t");
  });

  it("separates entries with newlines", () => {
    expect(copyAllText([makeFavorite(), makeFavorite({ word: "ephemeral", translations: ["短暂"] })])).toBe(
      "serendipity\t机缘巧合\nephemeral\t短暂",
    );
  });

  it("returns an empty string for no favorites", () => {
    expect(copyAllText([])).toBe("");
  });
});
