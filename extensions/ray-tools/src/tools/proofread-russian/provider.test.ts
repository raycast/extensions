import { describe, expect, it } from "vitest";

import { LanguageToolProvider, parseLanguageToolResponse } from "./provider";

describe("LanguageTool response", () => {
  it("maps Russian spelling and punctuation matches to app issues", () => {
    expect(
      parseLanguageToolResponse({
        matches: [
          {
            message: "Возможно найдена орфографическая ошибка.",
            shortMessage: "Орфографическая ошибка",
            replacements: [{ value: "текст" }],
            offset: 13,
            length: 4,
            rule: {
              id: "MORFOLOGIK_RULE_RU_RU",
              category: { id: "TYPOS" },
            },
          },
          {
            message: "Пропущена запятая перед союзом.",
            shortMessage: "Пропущена запятая",
            replacements: [{ value: "ошибкой, где" }],
            offset: 20,
            length: 11,
            rule: {
              id: "GDE_COMMA",
              category: { id: "PUNCTUATION" },
            },
          },
        ],
      }),
    ).toEqual([
      {
        message: "Возможно найдена орфографическая ошибка.",
        shortMessage: "Орфографическая ошибка",
        replacements: ["текст"],
        offset: 13,
        length: 4,
        category: "spelling",
        ruleId: "MORFOLOGIK_RULE_RU_RU",
      },
      {
        message: "Пропущена запятая перед союзом.",
        shortMessage: "Пропущена запятая",
        replacements: ["ошибкой, где"],
        offset: 20,
        length: 11,
        category: "punctuation",
        ruleId: "GDE_COMMA",
      },
    ]);
  });
});

describe("LanguageTool provider", () => {
  it("checks Russian text and builds the corrected result", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const text = "Это тект.";
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          matches: [
            {
              message: "Исправьте слово.",
              replacements: [{ value: "текст" }],
              offset: text.indexOf("тект"),
              length: "тект".length,
              rule: {
                category: { id: "TYPOS" },
              },
            },
          ],
        }),
      );
    };

    const result = await new LanguageToolProvider(
      fetcher,
      "https://example.test/check",
    ).check(text);

    expect(result.correctedText).toBe("Это текст.");
    expect(result.issues).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://example.test/check");
    expect(requests[0]?.init?.method).toBe("POST");

    const body = new URLSearchParams(String(requests[0]?.init?.body));
    expect(body.get("text")).toBe(text);
    expect(body.get("language")).toBe("ru-RU");
    expect(body.get("enabledOnly")).toBe("false");
  });

  it("applies a punctuation suggestion", async () => {
    const text = "Это текст где нужна запятая.";
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          matches: [
            {
              message: "Пропущена запятая.",
              replacements: [{ value: "текст, где" }],
              offset: text.indexOf("текст где"),
              length: "текст где".length,
              rule: {
                category: { id: "PUNCTUATION" },
              },
            },
          ],
        }),
      );

    const result = await new LanguageToolProvider(fetcher).check(text);

    expect(result.correctedText).toBe("Это текст, где нужна запятая.");
    expect(result.issues[0]?.category).toBe("punctuation");
  });

  it("adds a contextual spelling suggestion for separate не интересно", async () => {
    const text = "Мне не интересно";
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ matches: [] }));

    const result = await new LanguageToolProvider(fetcher).check(text);

    expect(result.issues).toEqual([
      expect.objectContaining({
        category: "spelling",
        replacements: ["неинтересно"],
        offset: text.indexOf("не интересно"),
        length: "не интересно".length,
        ruleId: "RU_NE_INTERESTNO",
      }),
    ]);
    expect(result.correctedText).toBe("Мне неинтересно");
  });
});
