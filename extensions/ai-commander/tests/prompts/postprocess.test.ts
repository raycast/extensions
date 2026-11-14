import { describe, expect, it } from "vitest";
import { cleanOutput, insertAfterSelection } from "../../src/prompts/postprocess";

describe("insertAfterSelection", () => {
  it("puts one blank line between original and result", () => {
    expect(insertAfterSelection("Original", "Result")).toBe("Original\n\nResult");
  });

  it("does not repeat the selection's whitespace, and keeps what follows in place", () => {
    const selection = "  Original\n";
    const result = cleanOutput("Result", selection);
    expect(insertAfterSelection(selection, result)).toBe("  Original\n\nResult\n");
  });
});

describe("cleanOutput", () => {
  it("removes a wrapper fence with or without a language", () => {
    expect(cleanOutput("```\nhello\n```")).toBe("hello");
    expect(cleanOutput("```markdown\nhello\nworld\n```\n")).toBe("hello\nworld");
    expect(cleanOutput("~~~\nhello\n~~~")).toBe("hello");
    expect(cleanOutput("```\r\nhello\r\n```")).toBe("hello");
  });

  it("keeps fences that do not wrap everything", () => {
    for (const output of ["Text\n```\ncode\n```", "```\ncode\n```\nText", "```\na\n```\nmiddle\n```\nb\n```"]) {
      expect(cleanOutput(output), output).toBe(output);
    }
  });

  it("keeps nested fences of a longer wrapper", () => {
    expect(cleanOutput("````\n```\ncode\n```\n````")).toBe("```\ncode\n```");
  });

  it("keeps the fence when the original begins with one", () => {
    const output = "```js\nconst a = 1;\n```";
    expect(cleanOutput(output, "```js\nvar a = 1;\n```")).toBe(output);
    expect(cleanOutput(output, "\n  ```js\nvar a;\n```")).toBe(`\n  ${output}`);
  });

  it("ignores inline code", () => {
    expect(cleanOutput("```a``` b\nc\n```")).toBe("```a``` b\nc\n```");
  });

  it("removes think blocks", () => {
    expect(cleanOutput("<think>reasoning</think>\nResult")).toBe("Result");
    expect(cleanOutput("A<THINK>x\ny</Think>B")).toBe("AB");
    expect(cleanOutput("<think>a</think>One<think>b</think>Two")).toBe("OneTwo");
  });

  it("removes a think block before a wrapper fence", () => {
    expect(cleanOutput("<think>x</think>\n```\nResult\n```")).toBe("Result");
  });

  it("drops a truncated think block at the start only", () => {
    expect(cleanOutput("<think>never closed")).toBe("");
    expect(cleanOutput("Result <think>not closed")).toBe("Result <think>not closed");
  });

  it("leaves think tags alone when the original has them", () => {
    expect(cleanOutput("Keep <think>this</think>", "Fix <think>this</think>")).toBe("Keep <think>this</think>");
  });

  it("adopts the original's outer whitespace", () => {
    expect(cleanOutput("  result\n\n", "\n\n  text \n")).toBe("\n\n  result \n");
    expect(cleanOutput("result\n", "text")).toBe("result");
  });

  it("returns an empty string when nothing is left", () => {
    expect(cleanOutput("  \n ", "  text  ")).toBe("");
    expect(cleanOutput("<think>x</think>", "  text  ")).toBe("");
  });

  it("copes with a whitespace-only original", () => {
    expect(cleanOutput("result", "  \n")).toBe("  \nresult");
  });

  it("stays fast on many open think tags", () => {
    const started = performance.now();
    cleanOutput("<think>".repeat(100_000));
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
