import { describe, expect, it } from "vitest";
import { cleaner, cfg } from "./helpers";

describe("Claude Code decorations", () => {
  it("strips full decoration", () => {
    const text = `❯ /skill:cmd "some args"
──────────────────────
/skill:cmd "some args"
  --flag value`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBe('/skill:cmd "some args" --flag value');
  });

  it("flattens full decoration with wrapped args", () => {
    const text = `❯ /my-skill:run-task "Analyze the dataset
  for patterns and report
  findings" --max-iterations 10
────────────────────────────────────────
/my-skill:run-task "Analyze the dataset
  for patterns and report
  findings" --max-iterations 10`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBe(
      '/my-skill:run-task "Analyze the dataset for patterns and report findings" --max-iterations 10',
    );
  });

  it("flattens a raw slash command", () => {
    const text = `/skill:cmd "args
  wrapped" --flag`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBe('/skill:cmd "args wrapped" --flag');
  });

  it("flattens a raw slash command with arguments on a continuation line", () => {
    expect(cleaner().stripClaudeCodeDecoration("/commit\n  --amend --no-edit", true)).toBe("/commit --amend --no-edit");
  });

  it("strips a short prompt with decoration", () => {
    const text = `❯ /commit
──────────
/commit`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBe("/commit");
  });

  it("strips a partial prompt prefix", () => {
    expect(cleaner().stripClaudeCodeDecoration("❯ /commit", true)).toBe("/commit");
  });

  it("strips outer quotes and unescapes", () => {
    const text = '"/my-skill:run-task \\"Analyze the data for anomalies\\" --max-iterations=50"';
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBe(
      '/my-skill:run-task "Analyze the data for anomalies" --max-iterations=50',
    );
  });

  it("strips outer quotes from a long prompt", () => {
    const text =
      '"/my-skill:run-task \\"Run a full analysis on the dataset. Check for patterns and outliers. ' +
      'Verify all results against baseline. Continue iterating until confidence is high enough to report.\\" ' +
      '--max-iterations=100"';
    const result = cleaner().stripClaudeCodeDecoration(text, true);
    expect(result).not.toBeNull();
    expect(result?.startsWith('/my-skill:run-task "Run a full')).toBe(true);
    expect(result?.endsWith("--max-iterations=100")).toBe(true);
    expect(result?.includes('\\"')).toBe(false);
  });

  it("does not flatten plain terminal-wrapped text", () => {
    const text = `This is a long paragraph that got
  wrapped by the terminal to the
  next line automatically`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBeNull();
  });

  it("does not flatten code", () => {
    expect(cleaner().stripClaudeCodeDecoration('func hello() {\n    print("world")\n}', true)).toBeNull();
  });

  it("does not flatten lists", () => {
    expect(cleaner().stripClaudeCodeDecoration("- item one\n- item two\n- item three", true)).toBeNull();
  });

  it("does not flatten multi-paragraph text", () => {
    const text = `First paragraph that is
  long enough.

Second paragraph here
  also wrapped.`;
    expect(cleaner().stripClaudeCodeDecoration(text, true)).toBeNull();
  });

  it("does not strip a plain single line", () => {
    expect(cleaner().stripClaudeCodeDecoration("just a single line of text", true)).toBeNull();
  });

  it("respects the disabled setting", () => {
    const text = `❯ /commit
──────────
/commit`;
    expect(cleaner().stripClaudeCodeDecoration(text, false)).toBeNull();
  });

  it("runs through the full pipeline", () => {
    const text = `❯ /commit
──────────
/commit`;
    const result = cleaner().transform(text, cfg());
    expect(result.wasTransformed).toBe(true);
    expect(result.trimmed).toBe("/commit");
  });

  it("leaves decoration in place when the pipeline setting is off", () => {
    const text = `❯ /commit
──────────
/commit`;
    const result = cleaner().transform(text, cfg({ flattenClaudeCodePrompts: false }));
    expect(result.trimmed).toBe("❯ /commit\n──────────\n/commit");
  });
});
