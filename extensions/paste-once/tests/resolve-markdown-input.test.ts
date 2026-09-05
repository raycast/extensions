import { describe, expect, it } from "vitest";
import { resolveMarkdownInput } from "../src/lib/resolve-markdown-input";

const wrapped = `- OpenAI returns 400 because the item
  was provided without a follow-up.
- Second item`;

describe("resolveMarkdownInput", () => {
  it("uses the argument when it is markdown", () => {
    expect(resolveMarkdownInput("- One\n- Two", "ignored")).toBe("- One\n- Two");
  });

  it("falls back to the clipboard when the argument is a truncated paste", () => {
    expect(resolveMarkdownInput("soning-replay.test.ts.", wrapped)).toBe(wrapped);
  });

  it("uses the clipboard when the argument is empty", () => {
    expect(resolveMarkdownInput("", wrapped)).toBe(wrapped);
    expect(resolveMarkdownInput(undefined, wrapped)).toBe(wrapped);
  });

  it("returns the argument when neither source is markdown", () => {
    expect(resolveMarkdownInput("just a line", "also plain")).toBe("just a line");
  });

  it("returns null when both sources are empty", () => {
    expect(resolveMarkdownInput(undefined, undefined)).toBeNull();
  });
});
