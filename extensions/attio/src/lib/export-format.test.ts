import { describe, expect, it } from "vitest";
import { toCsv, toMarkdownTable, toTsv } from "./export-format";

describe("toCsv", () => {
  it("joins columns/rows with commas, no special chars", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe("a,b\n1,2");
  });
  it("quotes a field containing a comma", () => {
    expect(toCsv(["a"], [["x,y"]])).toBe('a\n"x,y"');
  });
  it("quotes a field containing a newline", () => {
    expect(toCsv(["a"], [["x\ny"]])).toBe('a\n"x\ny"');
  });
  it("quotes a field containing a quote and doubles the inner quote", () => {
    expect(toCsv(["a"], [['say "hi"']])).toBe('a\n"say ""hi"""');
  });
});

describe("toMarkdownTable", () => {
  it("renders header, separator, and rows", () => {
    expect(toMarkdownTable(["a", "b"], [["1", "2"]])).toBe("| a | b |\n| --- | --- |\n| 1 | 2 |");
  });
  it("escapes pipes in cells", () => {
    expect(toMarkdownTable(["a"], [["x|y"]])).toBe("| a |\n| --- |\n| x\\|y |");
  });
});

describe("toTsv", () => {
  it("joins columns/rows with tabs", () => {
    expect(toTsv(["a", "b"], [["1", "2"]])).toBe("a\tb\n1\t2");
  });
});
