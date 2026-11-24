import { describe, expect, it } from "vitest";
import { clipboardUrl } from "../src/lib/clipboard";

describe("clipboardUrl", () => {
  it("takes a lone http(s) URL, trimmed", () => {
    expect(clipboardUrl("  https://example.com/a\n")).toEqual({ url: "https://example.com/a" });
    expect(clipboardUrl("http://example.com")).toEqual({ url: "http://example.com" });
    expect(clipboardUrl("HTTPS://Example.com/a?b=1#c")).toEqual({ url: "HTTPS://Example.com/a?b=1#c" });
    expect(clipboardUrl("https://example.com:8080/a@b")).toEqual({ url: "https://example.com:8080/a@b" });
  });

  it("refuses each AC-3 case", () => {
    const none = { refused: "none" };
    expect(clipboardUrl(undefined)).toEqual(none);
    expect(clipboardUrl("")).toEqual(none);
    expect(clipboardUrl("   \n ")).toEqual(none);
    expect(clipboardUrl("https://example.com/a b")).toEqual(none);
    expect(clipboardUrl("https://example.com/a\nhttps://example.com/b")).toEqual(none);
    for (const scheme of ["mailto:a@example.com", "file:///etc/hosts", "javascript:alert(1)", "ftp://example.com/x"]) {
      expect(clipboardUrl(scheme)).toEqual(none);
    }
    expect(clipboardUrl("https://")).toEqual(none);
    expect(clipboardUrl("https:///path")).toEqual(none);
    expect(clipboardUrl("https:example.com")).toEqual(none);
    expect(clipboardUrl("https://exa mple.com")).toEqual(none);
    expect(clipboardUrl("https://[::1")).toEqual(none);
    expect(clipboardUrl("example.com")).toEqual(none);
  });

  it("never extracts a URL from longer text", () => {
    expect(clipboardUrl("see https://example.com/a for details")).toEqual({ refused: "none" });
    expect(clipboardUrl("https://example.com/a, https://example.com/b")).toEqual({ refused: "none" });
    expect(clipboardUrl("password=hunter2 https://example.com")).toEqual({ refused: "none" });
  });

  it("refuses a URL with a username or password", () => {
    const credentials = { refused: "credentials" };
    expect(clipboardUrl("https://u:p@example.com/")).toEqual(credentials);
    expect(clipboardUrl("https://user@example.com/")).toEqual(credentials);
    expect(clipboardUrl("http://:p@example.com/")).toEqual(credentials);
    expect(clipboardUrl("https://@example.com/")).toEqual(credentials);
    expect(clipboardUrl(" https://u:p@example.com/a?x=1 ")).toEqual(credentials);
  });
});
