import { describe, expect, it } from "vitest";

import { parseSubstituteRule } from "./rule-parser";

describe("parseSubstituteRule", () => {
  it("parses slash-delimited input and prepends leading s", () => {
    const parsed = parseSubstituteRule("/foo/bar/g");

    expect(parsed.sedExpression).toBe("s/foo/bar/g");
    expect(parsed.delimiter).toBe("/");
    expect(parsed.pattern).toBe("foo");
    expect(parsed.replacement).toBe("bar");
    expect(parsed.flags).toBe("g");
  });

  it("supports custom delimiters", () => {
    const parsed = parseSubstituteRule("#foo#bar#g");

    expect(parsed.sedExpression).toBe("s#foo#bar#g");
  });

  it("supports escaped delimiters in pattern and replacement", () => {
    const parsed = parseSubstituteRule("/foo\\/bar/baz\\/qux/g");

    expect(parsed.pattern).toBe("foo\\/bar");
    expect(parsed.replacement).toBe("baz\\/qux");
  });

  it("accepts optional leading s", () => {
    const parsed = parseSubstituteRule("s/foo/bar/g");

    expect(parsed.sedExpression).toBe("s/foo/bar/g");
  });

  it("throws on malformed expressions", () => {
    expect(() => parseSubstituteRule("/foo/bar")).toThrow(
      /missing closing delimiter/i,
    );
    expect(() => parseSubstituteRule("foo/bar/g")).toThrow(/delimiter/i);
    expect(() => parseSubstituteRule("")).toThrow(/empty/i);
  });
});
