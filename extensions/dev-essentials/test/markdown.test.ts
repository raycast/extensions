import { describe, expect, it } from "vitest";
import { codeBlock } from "../src/lib/markdown";

describe("codeBlock", () => {
  it("uses a plain triple fence for normal content", () => {
    expect(codeBlock('{"a":1}', "json")).toBe('```json\n{"a":1}\n```');
  });

  it("uses a longer fence than any backtick run in the content", () => {
    const block = codeBlock("before\n```\nescaped?\n````");
    expect(block.startsWith("`````\n")).toBe(true);
    expect(block.endsWith("\n`````")).toBe(true);
  });
});
