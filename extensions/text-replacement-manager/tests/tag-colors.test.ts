import { describe, expect, it } from "vitest";

import { DEFAULT_TAG_COLOR, normalizeTagColors, tagColorFor } from "../src/lib/tag-colors";

describe("tag colors", () => {
  it("keeps supported color choices and removes colors for missing tags", () => {
    expect(
      normalizeTagColors(
        {
          chat: "Blue",
          personal: "Red",
          unknown: "Magenta",
          work: "NotAColor",
        },
        ["chat", "personal", "work"],
      ),
    ).toEqual({
      chat: "Blue",
      personal: "Red",
    });
  });

  it("uses the default tag color when a tag does not have a custom color", () => {
    expect(tagColorFor("personal", { chat: "Green" })).toBe(DEFAULT_TAG_COLOR);
    expect(tagColorFor("chat", { chat: "Green" })).toBe("Green");
  });
});
