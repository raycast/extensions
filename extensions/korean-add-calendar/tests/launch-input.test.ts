import { describe, expect, it } from "vitest";

import { resolveInitialSentence } from "../src/lib/launch-input";

describe("command launch input", () => {
  it("prefers the explicit command argument", () => {
    expect(
      resolveInitialSentence({
        arguments: { sentence: "내일 오후 3시 회의" },
        fallbackText: "모레 오후 4시 통화",
      }),
    ).toBe("내일 오후 3시 회의");
  });

  it("uses fallback text when no argument was entered", () => {
    expect(resolveInitialSentence({ arguments: {}, fallbackText: "모레 오후 4시 통화" })).toBe(
      "모레 오후 4시 통화",
    );
  });

  it("ignores whitespace-only launch values", () => {
    expect(resolveInitialSentence({ arguments: { sentence: "  " }, fallbackText: "\n" })).toBe("");
  });
});
