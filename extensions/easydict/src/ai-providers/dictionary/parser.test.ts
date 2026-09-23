/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseAIWordResult } from "./parser";

const logError = vi.hoisted(() => vi.fn());

vi.mock("@/utils/logger", () => ({ logError }));

beforeEach(() => {
  logError.mockReset();
});

describe("parseAIWordResult", () => {
  it("accepts a fenced structured entry and normalizes its strings", () => {
    const result = parseAIWordResult(`\`\`\`json
{
  "translation": "  奔跑  ",
  "entry": {
    "headword": " run ",
    "pronunciation": " rʌn ",
    "senses": [{
      "partOfSpeech": " verb ",
      "meanings": [" 跑 ", " 奔跑 "],
      "definition": "move quickly on foot",
      "examples": [{ "sentence": "I run daily.", "translation": "我每天跑步。" }]
    }],
    "forms": [{ "label": "past tense", "value": "ran" }]
  }
}
\`\`\``);

    expect(result).toEqual({
      translation: "奔跑",
      entry: {
        headword: "run",
        pronunciation: "rʌn",
        senses: [
          {
            partOfSpeech: "verb",
            meanings: ["跑", "奔跑"],
            definition: "move quickly on foot",
            examples: [{ sentence: "I run daily.", translation: "我每天跑步。" }],
          },
        ],
        forms: [{ label: "past tense", value: "ran" }],
      },
    });
  });

  it("accepts a non-dictionary result without inventing an entry", () => {
    expect(parseAIWordResult({ translation: "How are you?", entry: null })).toEqual({
      translation: "How are you?",
      entry: null,
    });
  });

  it("normalizes absent optional values", () => {
    expect(
      parseAIWordResult({
        translation: "跑",
        entry: {
          headword: "run",
          pronunciation: null,
          senses: [{ partOfSpeech: " ", meanings: ["跑"], definition: null, examples: null }],
          forms: null,
        },
      }),
    ).toEqual({
      translation: "跑",
      entry: {
        headword: "run",
        senses: [{ meanings: ["跑"], examples: [] }],
        forms: [],
      },
    });
  });

  it("identifies the invalid field in malformed model output", () => {
    expect(() =>
      parseAIWordResult({
        translation: "run",
        entry: { headword: "run", senses: [{ meanings: ["跑"], examples: "none" }], forms: [] },
      }),
    ).toThrow('entry.senses[0].examples" must be an array');
    expect(logError).toHaveBeenCalledWith(
      "AI Dictionary",
      expect.stringContaining('"examples":"none"'),
      expect.any(Error),
    );
  });
});
