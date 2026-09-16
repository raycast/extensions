import { describe, expect, it } from "vitest";
import { escapeMarkdownInline, formatMinutes } from "../src/utils/formatters";

describe("display formatters", () => {
  it("keeps externally supplied names inside one escaped Markdown line", () => {
    expect(escapeMarkdownInline("Battery [status](https://example.com)\n> injected")).toBe(
      "Battery \\[status\\](https://example.com) \\> injected",
    );
  });

  it("formats normalized runtime in hours and minutes", () => {
    expect(formatMinutes(290)).toBe("4 hr 50 min");
  });
});
