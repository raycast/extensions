import { describe, expect, it } from "vitest";
import { cleanText, cleanWithStats } from "./cleaner";
import {
  claudeBuildError,
  claudeCodeExplanation,
  claudeProseExplanation,
  claudeStepByStep,
  claudeTerminalResponse,
  claudeWithMarkdown,
  npmInstallOutput,
} from "./__fixtures__/cleaner";

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

  describe("ANSI escape codes", () => {
    it("strips color codes", () => {
      expect(cleanText("\x1b[32mhello\x1b[0m")).toBe("hello");
    });

    it("strips cursor movement sequences", () => {
      expect(cleanText("\x1b[2Aloading\x1b[K")).toBe("loading");
    });

    it("strips bold/dim codes", () => {
      expect(cleanText("\x1b[1mbold\x1b[22m and \x1b[2mdim\x1b[22m")).toBe("bold and dim");
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
    it("strips Braille spinner frames", () => {
      expect(cleanText("⠋ Loading...")).toBe("Loading...");
    });

    it("strips multiple spinner chars", () => {
      expect(cleanText("⠙⠹⠸ done")).toBe("done");
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

  describe("pipe borders", () => {
    it("strips leading pipe borders", () => {
      expect(cleanText("│ content")).toBe("content");
    });

    it("strips trailing pipe borders", () => {
      expect(cleanText("content │")).toBe("content");
    });

    it("strips plain pipe borders", () => {
      expect(cleanText("| content |")).toBe("content");
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

    it("does not join across sentence-ending question mark", () => {
      expect(cleanText("A question?\nAn answer.")).toBe("A question?\nAn answer.");
    });

    it("does not join across sentence-ending exclamation", () => {
      expect(cleanText("Done!\nNext step.")).toBe("Done!\nNext step.");
    });

    it("does not join across sentence-ending colon", () => {
      expect(cleanText("The following:\nitem one")).toBe("The following:\nitem one");
    });

    it("does not join list items onto the previous line", () => {
      expect(cleanText("Options:\n- one\n- two")).toBe("Options:\n- one\n- two");
    });

    it("does not join numbered list items", () => {
      expect(cleanText("Steps:\n1. first\n2. second")).toBe("Steps:\n1. first\n2. second");
    });

    it("does not join indented (code) lines", () => {
      // Indentation prevents joining, but the final .trim() pass strips leading spaces
      expect(cleanText("Example:\n  const x = 1;\n  const y = 2;")).toBe("Example:\nconst x = 1;\nconst y = 2;");
    });

    it("does not join lines inside a fenced code block", () => {
      expect(cleanText("```\nline one\nline two\n```")).toBe("```\nline one\nline two\n```");
    });

    it("does not join the fence delimiter with the following line", () => {
      expect(cleanText("```ts\nconst x = 1;\n```\nAfter.")).toBe("```ts\nconst x = 1;\n```\nAfter.");
    });

    it("preserves blank lines as paragraph breaks", () => {
      expect(cleanText("Para one.\n\nPara two.")).toBe("Para one.\n\nPara two.");
    });

    it("collapses 3+ blank lines to 2", () => {
      expect(cleanText("a\n\n\n\nb")).toBe("a\n\nb");
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
    // input: 10 chars, cleaned: 5 chars → 50% reduction
    const result = cleanWithStats("\x1b[32mhello\x1b[0m"); // "\x1b[32m" (4) + "hello" (5) + "\x1b[0m" (4) = 13 chars → 5 chars
    expect(result.reductionPercent).toBeGreaterThan(0);
    expect(result.reductionPercent).toBeLessThanOrEqual(100);
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
