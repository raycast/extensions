import { describe, expect, it } from "vitest";
import { codeBlock, dropPartialFirstLine, fence, lastLines } from "./text";

describe("fence", () => {
  it("is three backticks when the text has none", () => {
    expect(fence("hello")).toBe("```");
  });
  it("is longer than the longest backtick run in the text", () => {
    expect(fence("a\n```\nb")).toBe("````");
    expect(fence("`````")).toBe("``````");
  });
});

describe("codeBlock", () => {
  it("keeps output that contains its own fence inside the block", () => {
    const out = "```js\nconsole.log(1)\n```";
    const block = codeBlock(out);
    expect(block.startsWith("````\n")).toBe(true);
    expect(block.endsWith("\n````")).toBe(true);
    expect(block).toContain(out);
  });
});

describe("dropPartialFirstLine", () => {
  it("drops the cut first line of a tail read", () => {
    expect(dropPartialFirstLine("rtial line\nfull\nlines")).toBe("full\nlines");
  });
  it("keeps text with a single line", () => {
    expect(dropPartialFirstLine("one line")).toBe("one line");
  });
});

describe("lastLines", () => {
  it("returns the last n lines without splitting the whole text twice", () => {
    expect(lastLines("a\nb\nc\nd", 2)).toBe("c\nd");
    expect(lastLines("a\nb", 5)).toBe("a\nb");
  });
});
