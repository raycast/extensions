import { describe, expect, it } from "vitest";
import { ThinkFilter } from "../../src/providers/think-filter";

function run(chunks: readonly string[]): string {
  const filter = new ThinkFilter();
  return chunks.map((chunk) => filter.push(chunk)).join("") + filter.flush();
}

describe("ThinkFilter", () => {
  it("passes plain text through unchanged", () => {
    expect(run(["Hello ", "world"])).toBe("Hello world");
  });

  it("removes a block inside one chunk", () => {
    expect(run(["<think>reasoning</think>Answer"])).toBe("Answer");
  });

  it("removes blocks in the middle, and several of them", () => {
    expect(run(["a<think>1</think>b<think>2</think>c"])).toBe("abc");
  });

  it("removes tags split at every position", () => {
    const text = "Before<think>secret</think>After";
    for (let i = 1; i < text.length; i++) {
      expect(run([text.slice(0, i), text.slice(i)])).toBe("BeforeAfter");
    }
  });

  it("handles one character at a time", () => {
    expect(run([..."x<think>secret</think>y"])).toBe("xy");
  });

  it("drops whitespace after the closing tag, across chunks", () => {
    expect(run(["<think>r</think>\n", "\n  ", "Answer"])).toBe("Answer");
  });

  it("never emits reasoning, even without a closing tag", () => {
    expect(run(["Start<think>secret", " more"])).toBe("Start");
  });

  it("returns text that only looked like a tag", () => {
    expect(run(["a <thi", "s b"])).toBe("a <this b");
    expect(run(["a <", " b"])).toBe("a < b");
    expect(run(["<think>x</thin", "g</think>y"])).toBe("y");
  });

  it("flushes a held prefix at the end of the stream", () => {
    const filter = new ThinkFilter();
    expect(filter.push("value <th")).toBe("value ");
    expect(filter.flush()).toBe("<th");
  });

  it("emits text immediately instead of buffering it", () => {
    const filter = new ThinkFilter();
    expect(filter.push("Hello")).toBe("Hello");
  });

  it("holds a double angle bracket correctly", () => {
    expect(run(["<", "<think>x</think>y"])).toBe("<y");
  });

  it("handles a long stream of small chunks quickly", () => {
    const filter = new ThinkFilter();
    let length = 0;
    filter.push("<think>");
    for (let i = 0; i < 200_000; i++) filter.push("reasoning ");
    filter.push("</think>");
    for (let i = 0; i < 200_000; i++) length += filter.push("word ").length;
    expect(length).toBe(1_000_000);
  });
});
