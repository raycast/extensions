import { describe, expect, it } from "vitest";
import { appleScriptString } from "../src/lib/applescript";
import { AsideError, normalizeAsideError, parseJsonResponse } from "../src/lib/errors";

describe("AppleScript boundary", () => {
  it("escapes interpolation metacharacters and preserves Unicode", () => {
    expect(appleScriptString('café "one" \\ two\nthree')).toBe('café \\"one\\" \\\\ two\\nthree');
  });

  it("parses structured Unicode and multiline JSON", () => {
    const parsed = parseJsonResponse<{ title: string; url: string }>(
      '{"title":"Café \\"quote\\"\\nnext","url":"https://example.com/a\\\\b"}',
      "test",
    );
    expect(parsed).toEqual({ title: 'Café "quote"\nnext', url: "https://example.com/a\\b" });
  });

  it("rejects malformed responses with a typed error", () => {
    expect(() => parseJsonResponse("not-json", "tab list")).toThrow(AsideError);
  });

  it("recognizes Automation permission denial", () => {
    expect(normalizeAsideError(new Error("Not authorized to send Apple events. (-1743)")).kind).toBe(
      "permission-denied",
    );
  });

  it("recognizes a stale native tab ID", () => {
    expect(normalizeAsideError(new Error("ASIDE_STALE_TAB (2001)")).kind).toBe("stale-tab");
  });
});
