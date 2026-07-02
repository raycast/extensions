import { describe, it, expect } from "vitest";
import { isUrl, normalizeUrl } from "./detectUrl";

describe("isUrl", () => {
  it("accepts full http(s) URLs", () => {
    expect(isUrl("https://github.com/raycast/extensions")).toBe(true);
    expect(isUrl("http://example.com")).toBe(true);
    expect(isUrl("https://localhost:3000/path")).toBe(true);
  });

  it("accepts explicitly-schemed URLs with dotless hosts", () => {
    expect(isUrl("http://myserver:8080/admin")).toBe(true);
    expect(isUrl("http://router/")).toBe(true);
    expect(isUrl("http://[::1]:5173")).toBe(true);
    expect(isUrl("http://")).toBe(false); // scheme with nothing after is not a URL
  });

  it("accepts www. and bare domains, with or without a path", () => {
    expect(isUrl("www.google.com")).toBe(true);
    expect(isUrl("github.com/raycast/extensions")).toBe(true);
    expect(isUrl("sub.example.co.uk/a/b?c=d#e")).toBe(true);
  });

  it("accepts bare and scheme-less localhost (dev servers)", () => {
    expect(isUrl("localhost:3000")).toBe(true);
    expect(isUrl("localhost")).toBe(true);
    expect(isUrl("localhost:8080/health")).toBe(true);
  });

  it("rejects multi-word queries", () => {
    expect(isUrl("rust lifetimes")).toBe(false);
    expect(isUrl("what is example.com")).toBe(false);
    expect(isUrl("  spaced out  ")).toBe(false);
  });

  it("accepts a bare domain with a well-known TLD (no path)", () => {
    expect(isUrl("github.com")).toBe(true);
    expect(isUrl("example.io")).toBe(true);
  });

  it("rejects filenames and app bundles whose extension collides with a TLD", () => {
    expect(isUrl("Photos.app")).toBe(false);
    expect(isUrl("deploy.sh")).toBe(false);
    expect(isUrl("libfoo.so")).toBe(false);
    // but with a path it is clearly a URL:
    expect(isUrl("mysite.app/page")).toBe(true);
  });

  it("rejects a www. token with an unknown TLD (no short-circuit on www.)", () => {
    expect(isUrl("www.somethingtyped")).toBe(false);
  });

  it("rejects filenames and unknown bare TLDs (precision over recall)", () => {
    expect(isUrl("config.json")).toBe(false);
    expect(isUrl("index.js")).toBe(false);
    expect(isUrl("README.md")).toBe(false);
    expect(isUrl("file.txt")).toBe(false);
    // but with a path it is clearly a URL:
    expect(isUrl("mysite.zzz/page")).toBe(true);
  });

  it("rejects plain words and non-web schemes", () => {
    expect(isUrl("hello")).toBe(false);
    expect(isUrl("mailto:a@b.com")).toBe(false);
    expect(isUrl("file:///Users/me/x")).toBe(false);
    expect(isUrl("")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("keeps existing scheme", () => {
    expect(normalizeUrl("https://a.com")).toBe("https://a.com");
    expect(normalizeUrl("http://a.com")).toBe("http://a.com");
  });

  it("prepends https:// when scheme is missing", () => {
    expect(normalizeUrl("github.com/x")).toBe("https://github.com/x");
    expect(normalizeUrl("www.google.com")).toBe("https://www.google.com");
  });

  it("prepends http:// for scheme-less localhost", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeUrl("localhost")).toBe("http://localhost");
  });
});
