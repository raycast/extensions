import { describe, it, expect } from "vitest";
import { formatJson, formatAnki, formatQuizlet } from "./export";
import { Translation } from "./types";

const word1: Translation = {
  id: "1",
  word: "apple",
  translation: "яблуко",
  partOfSpeech: "noun",
  example: "I ate an apple.",
  exampleTranslation: "Я з'їв яблуко.",
  timestamp: 1000,
  type: "word",
};
const word2: Translation = {
  id: "2",
  word: "run",
  translation: "бігти",
  partOfSpeech: "verb",
  example: "I run every day.",
  exampleTranslation: "Я бігаю щодня.",
  timestamp: 2000,
  type: "word",
};
const text1: Translation = {
  id: "3",
  word: "Hello, how are you?",
  translation: "Привіт, як справи?",
  partOfSpeech: "",
  example: "",
  exampleTranslation: "",
  timestamp: 3000,
  type: "text",
};

describe("formatJson", () => {
  it("includes all translations", () => {
    const result = formatJson([word1, text1]);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("1");
    expect(parsed[1].id).toBe("3");
  });

  it("returns empty array for no translations", () => {
    expect(formatJson([])).toBe("[]");
  });
});

describe("formatAnki", () => {
  it("emits Basic-compatible directives and word entries only", () => {
    const result = formatAnki([word1, text1, word2]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("#separator:Tab");
    expect(lines[1]).toBe("#html:true");
    expect(lines[2]).toBe("#notetype:Basic");
    expect(lines[3]).toBe("#columns:Front\tBack");
    expect(lines[4]).toBe(
      'apple\t<div style="font-size:1.3em"><b>яблуко</b> <i style="opacity:.6">(noun)</i></div><hr><div>I ate an apple.</div><div style="opacity:.7">Я з\'їв яблуко.</div>',
    );
    expect(lines[5]).toBe(
      'run\t<div style="font-size:1.3em"><b>бігти</b> <i style="opacity:.6">(verb)</i></div><hr><div>I run every day.</div><div style="opacity:.7">Я бігаю щодня.</div>',
    );
    expect(lines[6]).toBe("");
    expect(lines).toHaveLength(7);
  });

  it("has 2 tab-separated columns per data row", () => {
    const result = formatAnki([word1]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    for (const line of dataLines) {
      expect(line.split("\t")).toHaveLength(2);
    }
  });

  it("omits example block when both example fields are empty", () => {
    const noExample: Translation = {
      ...word1,
      example: "",
      exampleTranslation: "",
    };
    const result = formatAnki([noExample]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    expect(dataLines[0]).toBe(
      'apple\t<div style="font-size:1.3em"><b>яблуко</b> <i style="opacity:.6">(noun)</i></div>',
    );
    expect(dataLines[0]).not.toContain("<hr>");
  });

  it("omits POS markup when partOfSpeech is empty", () => {
    const noPos: Translation = { ...word1, partOfSpeech: "" };
    const result = formatAnki([noPos]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    expect(dataLines[0]).not.toContain("<i");
    expect(dataLines[0]).toContain("<b>яблуко</b></div>");
  });

  it("escapes HTML special characters in user content", () => {
    const hostile: Translation = {
      ...word1,
      word: "R&B",
      translation: "<script>alert(1)</script>",
      example: "a < b && b > c",
      exampleTranslation: "",
      partOfSpeech: "",
    };
    const result = formatAnki([hostile]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    expect(dataLines[0]).toContain("R&amp;B");
    expect(dataLines[0]).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(dataLines[0]).toContain("a &lt; b &amp;&amp; b &gt; c");
    expect(dataLines[0]).not.toMatch(/<script>/);
  });
  it("returns empty string when no words", () => {
    expect(formatAnki([text1])).toBe("");
    expect(formatAnki([])).toBe("");
  });

  it("sanitizes tabs and newlines in fields", () => {
    const dirty: Translation = {
      ...word1,
      word: "line\tone",
      example: "has\nnewline",
      exampleTranslation: "has\r\nCRLF",
    };
    const result = formatAnki([dirty]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    expect(dataLines).toHaveLength(1);
    expect(dataLines[0].split("\t")).toHaveLength(2);
    expect(dataLines[0]).not.toMatch(/[\n\r]/);
  });
});

describe("formatQuizlet", () => {
  it("includes word entries only with 2 columns", () => {
    const result = formatQuizlet([word1, text1, word2]);
    const lines = result.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("apple\tяблуко");
    expect(lines[1]).toBe("run\tбігти");
  });

  it("returns empty string when no words", () => {
    expect(formatQuizlet([text1])).toBe("");
    expect(formatQuizlet([])).toBe("");
  });

  it("sanitizes tabs and newlines in fields", () => {
    const dirty: Translation = {
      ...word1,
      word: "tab\there",
      translation: "new\nline",
    };
    const result = formatQuizlet([dirty]);
    const lines = result.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    expect(lines[0].split("\t")).toHaveLength(2);
  });
});
