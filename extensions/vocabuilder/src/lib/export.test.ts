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
  it("includes header and word entries only", () => {
    const result = formatAnki([word1, text1, word2]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("#separator:Tab");
    expect(lines[1]).toBe("#columns:Word\tTranslation\tPart of Speech\tExample\tExample Translation");
    expect(lines[2]).toBe("apple\tяблуко\tnoun\tI ate an apple.\tЯ з'їв яблуко.");
    expect(lines[3]).toBe("run\tбігти\tverb\tI run every day.\tЯ бігаю щодня.");
    expect(lines[4]).toBe("");
    expect(lines).toHaveLength(5);
  });

  it("has 5 tab-separated columns per data row", () => {
    const result = formatAnki([word1]);
    const dataLines = result.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
    for (const line of dataLines) {
      expect(line.split("\t")).toHaveLength(5);
    }
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
    expect(dataLines[0].split("\t")).toHaveLength(5);
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

  it("has 2 tab-separated columns per line", () => {
    const result = formatQuizlet([word1, word2]);
    const lines = result.split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line.split("\t")).toHaveLength(2);
    }
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
