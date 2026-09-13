import { describe, expect, it } from "vitest";

import { applyCorrections, findRussianContextIssues } from "./domain";

describe("Russian proofreading corrections", () => {
  it("applies multiple suggested corrections without shifting later offsets", () => {
    const text = "Это тект и очен хорош.";
    const typoOffset = text.indexOf("тект");
    const adverbOffset = text.indexOf("очен");

    expect(
      applyCorrections(text, [
        {
          message: "Исправьте слово",
          replacements: ["текст"],
          offset: typoOffset,
          length: "тект".length,
          category: "spelling",
        },
        {
          message: "Исправьте слово",
          replacements: ["очень"],
          offset: adverbOffset,
          length: "очен".length,
          category: "spelling",
        },
      ]),
    ).toBe("Это текст и очень хорош.");
  });

  it("suggests the joined spelling of неинтересно without a contrast", () => {
    const text = "Мне не интересно";

    expect(findRussianContextIssues(text)).toEqual([
      expect.objectContaining({
        category: "spelling",
        replacements: ["неинтересно"],
        offset: text.indexOf("не интересно"),
        length: "не интересно".length,
      }),
    ]);
  });

  it("keeps separate не интересно with explicit negation or contrast", () => {
    expect(findRussianContextIssues("Мне совсем не интересно")).toEqual([]);
    expect(findRussianContextIssues("Мне это не интересно, а важно")).toEqual(
      [],
    );
  });
});
