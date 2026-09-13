import { describe, expect, it } from "vitest";

import {
  asMarkdownCodeBlock,
  formatIssueDetail,
  formatIssueTitle,
  formatResult,
} from "./markdown";
import type { ProofreadingResult } from "./types";

describe("Russian proofreading result markdown", () => {
  it("shows the corrected text and each suggested replacement", () => {
    const result: ProofreadingResult = {
      text: "Это тект где нужна запятая.",
      correctedText: "Это текст, где нужна запятая.",
      language: "ru-RU",
      provider: "languagetool",
      issues: [
        {
          message: "Возможно найдена орфографическая ошибка.",
          shortMessage: "Орфографическая ошибка",
          replacements: ["текст"],
          offset: 4,
          length: 4,
          category: "spelling",
          ruleId: "MORFOLOGIK_RULE_RU_RU",
        },
      ],
    };

    const markdown = formatResult(result);

    expect(markdown).toContain("## 1 issue found");
    expect(markdown).toContain(asMarkdownCodeBlock(result.correctedText));
    expect(markdown).toContain("#### 1. Spelling");
    expect(markdown).toContain(asMarkdownCodeBlock("тект"));
    expect(markdown).toContain(asMarkdownCodeBlock("текст"));
    expect(markdown).toContain("Возможно найдена орфографическая ошибка.");
  });

  it("reports when the text has no spelling or punctuation issues", () => {
    const result: ProofreadingResult = {
      text: "Это правильный текст.",
      correctedText: "Это правильный текст.",
      language: "ru-RU",
      provider: "languagetool",
      issues: [],
    };

    expect(formatResult(result)).toContain("## No issues found");
  });

  it("formats every issue as a separate list item", () => {
    const text = "Это тект где нужна запятая.";
    const result: ProofreadingResult = {
      text,
      correctedText: "Это текст, где нужна запятая.",
      language: "ru-RU",
      provider: "languagetool",
      issues: [
        {
          message: "Возможно найдена орфографическая ошибка.",
          replacements: ["текст"],
          offset: text.indexOf("тект"),
          length: "тект".length,
          category: "spelling",
        },
        {
          message: "Пропущена запятая.",
          replacements: ["текст, где"],
          offset: text.indexOf("тект где"),
          length: "тект где".length,
          category: "punctuation",
        },
      ],
    };

    expect(
      result.issues.map((issue) => formatIssueTitle(result, issue)),
    ).toEqual(["тект → текст", "тект где → текст, где"]);
    expect(formatIssueDetail(result, result.issues[1]!, 1)).toContain(
      "#### 2. Punctuation",
    );
  });
});
