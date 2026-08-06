import { describe, expect, it } from "vitest";
import { markdownCode, parseEnvironment, parseShellWords, shellQuote } from "../src/lib/parsers";

describe("parseEnvironment", () => {
  it("accepts lines, commas, comments, and values containing equals", () => {
    expect(parseEnvironment("FOO=one\n# comment\nBAR=two=three, EMPTY=")).toEqual([
      "FOO=one",
      "BAR=two=three",
      "EMPTY=",
    ]);
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
