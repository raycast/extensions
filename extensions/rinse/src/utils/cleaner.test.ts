import { describe, expect, it } from "vitest";
import {
  classifyLines,
  cleanText,
  cleanWithStats,
  dedentParagraphs,
  joinWrappedLines,
  normalizeSpacing,
  stripArtifacts,
} from "./cleaner";
import {
  claudeBuildError,
  claudeCodeExplanation,
  claudeProseExplanation,
  claudeStepByStep,
  claudeTerminalResponse,
  claudeWithMarkdown,
  npmInstallOutput,
} from "./__fixtures__/cleaner";

// ─── stripArtifacts ───────────────────────────────────────────────────────────

describe("stripArtifacts", () => {
  it("strips ANSI color codes", () => {
    expect(stripArtifacts("\x1b[32mhello\x1b[0m")).toBe("hello");
  });

  it("strips cursor movement sequences", () => {
    expect(stripArtifacts("\x1b[2Aloading\x1b[K")).toBe("loading");
  });

  it("strips bold and dim codes", () => {
    expect(stripArtifacts("\x1b[1mbold\x1b[22m and \x1b[2mdim\x1b[22m")).toBe("bold and dim");
  });

  it("strips box-drawing characters", () => {
    expect(stripArtifacts("┌──┐\n│hi│\n└──┘")).toBe("\nhi\n");
  });

  it("strips Braille spinner frames", () => {
    expect(stripArtifacts("⠋ Loading...")).toBe(" Loading...");
  });

  it("leaves plain text unchanged", () => {
    expect(stripArtifacts("hello world")).toBe("hello world");
  });
});

// ─── dedentParagraphs ─────────────────────────────────────────────────────────

describe("dedentParagraphs", () => {
  it("removes uniform indent from a single paragraph", () => {
    expect(dedentParagraphs("  foo\n  bar")).toBe("foo\nbar");
  });

  it("dedents each paragraph independently", () => {
    const input = "  a\n  b\n\n    c\n    d";
    expect(dedentParagraphs(input)).toBe("a\nb\n\nc\nd");
  });

  it("does not modify paragraphs with no common indent", () => {
    expect(dedentParagraphs("foo\n  bar")).toBe("foo\n  bar");
  });

  it("skips blank lines when computing minimum indent", () => {
    expect(dedentParagraphs("  foo\n\n  bar")).toBe("foo\n\nbar");
  });

  it("leaves already-zero-indented text unchanged", () => {
    expect(dedentParagraphs("foo\nbar")).toBe("foo\nbar");
  });
});

// ─── classifyLines ────────────────────────────────────────────────────────────

describe("classifyLines", () => {
  describe("table rows", () => {
    it("tags a two-column row as table-row", () => {
      const result = classifyLines(["| Name | Value |"]);
      expect(result).toEqual([{ content: "| Name | Value |", kind: "table-row" }]);
    });

    it("tags a multi-column row as table-row", () => {
      const result = classifyLines(["| A | B | C |"]);
      expect(result).toEqual([{ content: "| A | B | C |", kind: "table-row" }]);
    });

    it("does not tag a single-column row as table-row", () => {
      const result = classifyLines(["| content |"]);
      expect(result[0].kind).toBe("text");
    });
  });

  describe("separator lines", () => {
    it("drops lines of only dashes", () => {
      expect(classifyLines(["---"])).toEqual([]);
    });

    it("drops lines of only equals signs", () => {
      expect(classifyLines(["==="])).toEqual([]);
    });

    it("drops lines of only tildes", () => {
      expect(classifyLines(["~~~"])).toEqual([]);
    });

    it("drops a separator after pipe border stripping", () => {
      expect(classifyLines(["| --- |"])).toEqual([]);
    });
  });

  describe("pipe border stripping", () => {
    it("strips leading pipe border from text lines", () => {
      const result = classifyLines(["| content"]);
      expect(result).toEqual([{ content: "content", kind: "text" }]);
    });

    it("strips trailing pipe border from text lines", () => {
      const result = classifyLines(["content |"]);
      expect(result).toEqual([{ content: "content", kind: "text" }]);
    });

    it("strips both pipe borders", () => {
      const result = classifyLines(["| content |"]);
      expect(result).toEqual([{ content: "content", kind: "text" }]);
    });
  });

  describe("empty lines", () => {
    it("preserves empty lines as text", () => {
      expect(classifyLines([""])).toEqual([{ content: "", kind: "text" }]);
    });
  });

  describe("does not mutate input", () => {
    it("leaves the input array unchanged", () => {
      const input = ["| Name | Value |", "---", "foo"];
      const copy = [...input];
      classifyLines(input);
      expect(input).toEqual(copy);
    });
  });
});

// ─── joinWrappedLines ─────────────────────────────────────────────────────────

describe("joinWrappedLines", () => {
  const text = (content: string) => ({ content, kind: "text" as const });
  const tableRow = (content: string) => ({ content, kind: "table-row" as const });

  describe("basic joining", () => {
    it("joins two consecutive text lines", () => {
      expect(joinWrappedLines([text("hello"), text("world")])).toEqual(["hello world"]);
    });

    it("trims leading whitespace from the continued line", () => {
      expect(joinWrappedLines([text("foo"), text("  bar")])).toEqual(["foo bar"]);
    });

    it("chains multiple soft-wrapped lines into one", () => {
      expect(joinWrappedLines([text("a"), text("b"), text("c")])).toEqual(["a b c"]);
    });
  });

  describe("sentence boundaries", () => {
    it("does not join across a period", () => {
      expect(joinWrappedLines([text("First."), text("Second.")])).toEqual(["First.", "Second."]);
    });

    it("does not join across a question mark", () => {
      expect(joinWrappedLines([text("Done?"), text("Yes.")])).toEqual(["Done?", "Yes."]);
    });

    it("does not join across an exclamation mark", () => {
      expect(joinWrappedLines([text("Done!"), text("Next.")])).toEqual(["Done!", "Next."]);
    });

    it("does not join across a colon", () => {
      expect(joinWrappedLines([text("Example:"), text("item")])).toEqual(["Example:", "item"]);
    });
  });

  describe("list items", () => {
    it("does not join a dash list item onto the previous line", () => {
      expect(joinWrappedLines([text("Options"), text("- one")])).toEqual(["Options", "- one"]);
    });

    it("does not join a numbered list item onto the previous line", () => {
      expect(joinWrappedLines([text("Steps"), text("1. first")])).toEqual(["Steps", "1. first"]);
    });
  });

  describe("empty lines", () => {
    it("does not join across an empty line", () => {
      expect(joinWrappedLines([text("para one"), text(""), text("para two")])).toEqual(["para one", "", "para two"]);
    });

    it("does not join when next is undefined (last line)", () => {
      expect(joinWrappedLines([text("only")])).toEqual(["only"]);
    });
  });

  describe("table rows", () => {
    it("does not join a table row onto the previous line", () => {
      expect(joinWrappedLines([text("intro"), tableRow("| A | B |")])).toEqual(["intro", "| A | B |"]);
    });

    it("does not join a text line onto a table row", () => {
      expect(joinWrappedLines([tableRow("| A | B |"), text("footer")])).toEqual(["| A | B |", "footer"]);
    });
  });

  describe("fenced code blocks", () => {
    it("does not join lines inside a fence", () => {
      const lines = [text("```"), text("line one"), text("line two"), text("```")];
      expect(joinWrappedLines(lines)).toEqual(["```", "line one", "line two", "```"]);
    });

    it("does not join the opening fence delimiter with the next line", () => {
      const lines = [text("```ts"), text("const x = 1;"), text("```")];
      expect(joinWrappedLines(lines)).toEqual(["```ts", "const x = 1;", "```"]);
    });
  });

  describe("indented code lines", () => {
    it("does not join an indented line forward onto the next line", () => {
      // isIndentedCode guards the current line from joining forward, not the next line.
      expect(joinWrappedLines([text("  const x = 1;"), text("  const y = 2;")])).toEqual([
        "  const x = 1;",
        "  const y = 2;",
      ]);
    });
  });

  describe("CLI command lines", () => {
    it("does not join a line containing ' -- ' onto the next line", () => {
      expect(joinWrappedLines([text("npm run build -- --skipLibCheck"), text("npm test -- --timeout 10000")])).toEqual([
        "npm run build -- --skipLibCheck",
        "npm test -- --timeout 10000",
      ]);
    });
  });

  describe("does not mutate input", () => {
    it("leaves the input array unchanged", () => {
      const lines = [text("hello"), text("world")];
      const copy = lines.map((l) => ({ ...l }));
      joinWrappedLines(lines);
      expect(lines).toEqual(copy);
    });
  });
});

// ─── normalizeSpacing ─────────────────────────────────────────────────────────

describe("normalizeSpacing", () => {
  it("trims leading whitespace from each line", () => {
    expect(normalizeSpacing("  foo\n  bar")).toBe("foo\nbar");
  });

  it("trims trailing whitespace from each line", () => {
    expect(normalizeSpacing("foo   \nbar   ")).toBe("foo\nbar");
  });

  it("collapses 3 blank lines to 2", () => {
    expect(normalizeSpacing("a\n\n\nb")).toBe("a\n\nb");
  });

  it("collapses 4+ blank lines to 2", () => {
    expect(normalizeSpacing("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("preserves a single blank line", () => {
    expect(normalizeSpacing("a\n\nb")).toBe("a\n\nb");
  });

  it("strips leading and trailing whitespace from the full text", () => {
    expect(normalizeSpacing("\n\nfoo\n\n")).toBe("foo");
  });
});

// ─── cleanText ────────────────────────────────────────────────────────────────

describe("cleanText", () => {
  describe("passthrough", () => {
    it("returns empty string unchanged", () => {
      expect(cleanText("")).toBe("");
    });

    it("returns whitespace-only input unchanged", () => {
      expect(cleanText("   \n  ")).toBe("   \n  ");
    });

    it("returns already-clean text unchanged", () => {
      const clean = "This is clean text.\nNothing to remove.";
      expect(cleanText(clean)).toBe(clean);
    });
  });

  describe("box-drawing characters", () => {
    it("strips horizontal and vertical box chars", () => {
      expect(cleanText("│ output │")).toBe("output");
    });

    it("strips corner and cross box chars", () => {
      expect(cleanText("┌──────┐\n│ hi   │\n└──────┘")).toBe("hi");
    });
  });

  describe("spinner and Braille characters", () => {
    it("strips Braille spinner frames and trims residual space", () => {
      expect(cleanText("⠋ Loading...")).toBe("Loading...");
    });
  });

  describe("decoration lines", () => {
    it("removes lines of repeated dashes, joining surrounding lines", () => {
      // No sentence-ending punct → lines get joined after decoration is removed
      expect(cleanText("hello\n---\nworld")).toBe("hello world");
    });

    it("removes lines of repeated equals signs, joining surrounding lines", () => {
      expect(cleanText("hello\n===\nworld")).toBe("hello world");
    });

    it("removes lines of repeated dashes, preserving break at sentence boundary", () => {
      // Sentence-ending period prevents joining → newline preserved
      expect(cleanText("First sentence.\n---\nSecond sentence.")).toBe("First sentence.\nSecond sentence.");
    });

    it("strips box-drawing dash chars, leaving a blank line separator", () => {
      // ─── chars are stripped by BOX_DRAWING_RE before the decoration pass,
      // leaving an empty line which becomes a paragraph break
      expect(cleanText("hello\n───\nworld")).toBe("hello\n\nworld");
    });

    it("keeps lines with meaningful content mixed with dashes", () => {
      expect(cleanText("hello-world")).toBe("hello-world");
    });
  });

  describe("markdown tables", () => {
    it("preserves a two-column table intact", () => {
      const table = "| Name | Value |\n| ---- | ----- |\n| foo  | bar   |";
      expect(cleanText(table)).toBe(table);
    });

    it("preserves a multi-column table intact", () => {
      const table = "| A | B | C |\n| - | - | - |\n| 1 | 2 | 3 |";
      expect(cleanText(table)).toBe(table);
    });

    it("does not join table rows together", () => {
      const input = "| col1 | col2 |\n| val1 | val2 |";
      expect(cleanText(input)).toBe(input);
    });

    it("preserves a table that follows a paragraph", () => {
      const input = "Some intro text.\n\n| Name | Value |\n| ---- | ----- |\n| foo  | bar   |";
      expect(cleanText(input)).toBe(input);
    });
  });

  describe("line joining", () => {
    it("joins wrapped lines", () => {
      expect(cleanText("This is a long\nline that wrapped")).toBe("This is a long line that wrapped");
    });

    it("does not join across sentence-ending period", () => {
      expect(cleanText("First sentence.\nSecond sentence.")).toBe("First sentence.\nSecond sentence.");
    });

    it("does not join indented (code) lines", () => {
      // Indentation prevents joining, but the final .trim() pass strips leading spaces
      expect(cleanText("Example:\n  const x = 1;\n  const y = 2;")).toBe("Example:\nconst x = 1;\nconst y = 2;");
    });

    it("does not join the fence delimiter with the following line", () => {
      expect(cleanText("```ts\nconst x = 1;\n```\nAfter.")).toBe("```ts\nconst x = 1;\n```\nAfter.");
    });

    it("joins soft-wrapped lines in later paragraphs when first paragraph has no leading indent", () => {
      expect(cleanText("No indent.\n\n  Indented\n  paragraph.")).toBe("No indent.\n\nIndented paragraph.");
    });

    it("strips uniform leading indent and joins soft-wrapped lines", () => {
      const input = [
        "  npm run publish",
        "",
        "  It will pull contributions first, then open a GitHub auth prompt and create the PR in",
        "  raycast/extensions automatically.",
      ].join("\n");
      expect(cleanText(input)).toBe(
        "npm run publish\n\nIt will pull contributions first, then open a GitHub auth prompt and create the PR in raycast/extensions automatically.",
      );
    });
  });

  // ─── Idempotency ───────────────────────────────────────────────────────────

  describe("idempotency", () => {
    const cases = [
      ["npm install output", npmInstallOutput],
      ["claude prose explanation", claudeProseExplanation],
      ["claude step-by-step", claudeStepByStep],
      ["claude code explanation", claudeCodeExplanation],
      ["claude terminal response", claudeTerminalResponse],
      ["claude markdown response", claudeWithMarkdown],
      ["claude build error", claudeBuildError],
    ] as const;

    it.each(cases)("%s is idempotent", (_, input) => {
      expect(cleanText(cleanText(input))).toBe(cleanText(input));
    });
  });

  // ─── Snapshot tests ────────────────────────────────────────────────────────
  // Inputs live in __fixtures__/cleaner.ts. Add a fixture there, then a
  // matching it() here. If a regex change shifts output, the diff is immediate.

  describe("snapshots", () => {
    it("npm install output", () => {
      expect(cleanText(npmInstallOutput)).toMatchSnapshot();
    });

    it("claude prose explanation → paste to Slack or notes", () => {
      expect(cleanText(claudeProseExplanation)).toMatchSnapshot();
    });

    it("claude step-by-step → paste to Jira or Confluence", () => {
      expect(cleanText(claudeStepByStep)).toMatchSnapshot();
    });

    it("claude code explanation → paste to PR description or code comment", () => {
      expect(cleanText(claudeCodeExplanation)).toMatchSnapshot();
    });

    it("claude terminal response with box-drawing header → paste to notes or AI prompt", () => {
      expect(cleanText(claudeTerminalResponse)).toMatchSnapshot();
    });

    it("claude markdown response with header, inline code, and fenced block", () => {
      expect(cleanText(claudeWithMarkdown)).toMatchSnapshot();
    });

    it("claude build error with fixed-width padding → paste anywhere", () => {
      expect(cleanText(claudeBuildError)).toMatchSnapshot();
    });
  });
});

// ─── cleanWithStats ───────────────────────────────────────────────────────────

describe("cleanWithStats", () => {
  it("returns changed=false when input is already clean", () => {
    const input = "Already clean text.";
    const result = cleanWithStats(input);
    expect(result.changed).toBe(false);
  });

  it("returns changed=true when cleaning occurs", () => {
    const result = cleanWithStats("\x1b[32mcolored\x1b[0m");
    expect(result.changed).toBe(true);
  });

  it("returns reductionPercent=0 for empty input", () => {
    const result = cleanWithStats("");
    expect(result.reductionPercent).toBe(0);
  });

  it("calculates reductionPercent correctly", () => {
    const result = cleanWithStats("\x1b[32mhello\x1b[0m");
    expect(result.reductionPercent).toBe(64);
  });

  it("preserves original in result", () => {
    const input = "some text";
    expect(cleanWithStats(input).original).toBe(input);
  });

  it("counts original and cleaned lines accurately", () => {
    // Sentence-ending periods prevent joining → 2 lines after decoration removed
    const input = "Line one.\n---\nLine two.";
    const result = cleanWithStats(input);
    expect(result.originalLineCount).toBe(3);
    expect(result.cleanedLineCount).toBe(2); // decoration line removed
  });
});
