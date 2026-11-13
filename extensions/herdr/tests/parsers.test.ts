import { describe, expect, it } from "vitest";
import { markdownCode, parseEnvironment, parseIntegrationStatus, parseShellWords, shellQuote } from "../src/lib/parsers";

describe("parseEnvironment", () => {
  it("accepts lines, comments, and values containing equals", () => {
    expect(parseEnvironment("FOO=one\n# comment\nBAR=two=three\nEMPTY=")).toEqual([
      "FOO=one",
      "BAR=two=three",
      "EMPTY=",
    ]);
  });

  it("keeps commas inside values", () => {
    expect(parseEnvironment("NO_PROXY=localhost,127.0.0.1")).toEqual(["NO_PROXY=localhost,127.0.0.1"]);
  });

  it("rejects invalid keys and missing equals signs", () => {
    expect(() => parseEnvironment("1BAD=value")).toThrow("Invalid environment key");
    expect(() => parseEnvironment("MISSING")).toThrow("Use KEY=VALUE");
  });
});

describe("parseShellWords", () => {
  it("preserves quoted and escaped argument boundaries", () => {
    expect(parseShellWords(`--model codex "two words" 'three words' escaped\\ value ""`)).toEqual([
      "--model",
      "codex",
      "two words",
      "three words",
      "escaped value",
      "",
    ]);
  });

  it("rejects incomplete escaping and quotes", () => {
    expect(() => parseShellWords("value\\")).toThrow("backslash");
    expect(() => parseShellWords("'value")).toThrow("unterminated single quote");
  });
});

describe("shellQuote", () => {
  it("quotes hostile shell characters as one literal argument", () => {
    expect(shellQuote("hello'; touch /tmp/nope; '")).toBe("'hello'\\''; touch /tmp/nope; '\\''' ".trim());
    expect(shellQuote("")).toBe("''");
  });
});

describe("markdownCode", () => {
  it("uses a fence longer than any fence in the output", () => {
    expect(markdownCode("before\n```\nafter")).toMatch(/^````\n/);
  });
});

describe("parseIntegrationStatus", () => {
  // Regression: a version group before the path group ("current (v7) (/path)")
  // made the greedy trailing-paren match swallow both groups into detail,
  // producing "v7) (/path" instead of the version and path separately.
  it("keeps the trailing path as detail when a version group precedes it", () => {
    expect(parseIntegrationStatus("claude: current (v7) (/home/user/.claude/hooks/herdr-agent-state.sh)")).toEqual([
      { name: "claude", status: "current", detail: "/home/user/.claude/hooks/herdr-agent-state.sh" },
    ]);
  });

  it("handles a single trailing path group with no version", () => {
    expect(parseIntegrationStatus("pi: not installed (/home/user/.pi/agent/extensions/herdr-agent-state.ts)")).toEqual([
      { name: "pi", status: "not installed", detail: "/home/user/.pi/agent/extensions/herdr-agent-state.ts" },
    ]);
  });

  it("skips lines that do not match the expected shape", () => {
    expect(parseIntegrationStatus("not a status line")).toEqual([]);
  });
});
