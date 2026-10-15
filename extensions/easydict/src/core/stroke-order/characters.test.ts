import { describe, expect, it } from "vitest";

import { getStrokeOrderCharacters } from "./characters";

describe("getStrokeOrderCharacters", () => {
  it("uses the translated text when translating to Chinese", () => {
    expect(
      getStrokeOrderCharacters({
        fromLanguage: "en",
        toLanguage: "zh-CHS",
        sourceText: "hello",
        translatedText: "你好",
      }),
    ).toEqual(["你", "好"]);
  });

  it("uses the original query when translating from Chinese", () => {
    expect(
      getStrokeOrderCharacters({
        fromLanguage: "zh-CHT",
        toLanguage: "en",
        sourceText: "學習",
        translatedText: "study",
      }),
    ).toEqual(["學", "習"]);
  });

  it("does not treat Japanese Kanji as a Chinese translation", () => {
    expect(
      getStrokeOrderCharacters({
        fromLanguage: "ja",
        toLanguage: "en",
        sourceText: "勉強",
        translatedText: "study",
      }),
    ).toEqual([]);
  });

  it("preserves order and removes duplicates and punctuation", () => {
    expect(
      getStrokeOrderCharacters({
        fromLanguage: "zh-CHS",
        toLanguage: "en",
        sourceText: "你好，你好！学习。",
        translatedText: "study",
      }),
    ).toEqual(["你", "好", "学", "习"]);
  });

  it("limits the result to eight characters", () => {
    expect(
      getStrokeOrderCharacters({
        fromLanguage: "zh-CHS",
        toLanguage: "en",
        sourceText: "一二三四五六七八九十",
        translatedText: "numbers",
      }),
    ).toEqual(["一", "二", "三", "四", "五", "六", "七", "八"]);
  });
});
