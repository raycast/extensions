import { describe, expect, it } from "vitest";

import { buildCodeBlock, buildFormatResultMarkdown } from "../src/lib/markdown";

describe("Markdown code blocks", () => {
  it("uses a standard fenced block for ordinary text", () => {
    expect(buildCodeBlock('{"a":1}', "json")).toBe('```json\n{"a":1}\n```');
  });

  it("uses a longer fence than any backtick run in the content", () => {
    expect(buildCodeBlock("before ``` after", "text")).toBe(
      "````text\nbefore ``` after\n````",
    );
  });

  it("adds a concise notice for best-effort formatting", () => {
    expect(buildFormatResultMarkdown("{value: 1}", "text", true)).toBe(
      "> Invalid JSON · Best-effort formatting\n\n```text\n{value: 1}\n```",
    );
  });

  it("does not add a notice for valid JSON", () => {
    expect(buildFormatResultMarkdown('{"value":1}', "json", false)).toBe(
      '```json\n{"value":1}\n```',
    );
  });
});
