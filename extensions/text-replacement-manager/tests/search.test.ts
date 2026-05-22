import { describe, expect, it } from "vitest";

import { replacementSearchKeywords } from "../src/lib/search";

describe("replacementSearchKeywords", () => {
  it("indexes replacement text and tags for Raycast list filtering", () => {
    expect(
      replacementSearchKeywords({
        uuid: "uuid-omw",
        trigger: "omw",
        replacementText: "On my way!",
        tags: ["chat", "travel"],
        enabled: true,
      }),
    ).toEqual(["On my way!", "chat", "travel"]);
  });

  it("removes empty and duplicate keywords case-insensitively", () => {
    expect(
      replacementSearchKeywords({
        uuid: "uuid-omw",
        trigger: "omw",
        replacementText: "chat",
        tags: [" ", "Chat", "travel"],
        enabled: true,
      }),
    ).toEqual(["chat", "travel"]);
  });
});
