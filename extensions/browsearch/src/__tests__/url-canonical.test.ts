import { describe, it, expect } from "vitest";
import { canonicalizeUrl, dedupeByCanonical } from "../services/url-canonical";
import type { MozPlacesRow } from "../types";

describe("canonicalizeUrl", () => {
  it("strips www. from host", () => {
    expect(canonicalizeUrl("https://www.youtube.com/").key).toBe("youtube.com/");
  });

  it("removes known tracking params", () => {
    const { url, key } = canonicalizeUrl("https://example.com/page?utm_source=google&id=1");
    expect(url).not.toContain("utm_source");
    expect(key).not.toContain("utm_source");
    expect(url).toContain("id=1");
  });

  it("removes all utm_* variants", () => {
    const { key } = canonicalizeUrl(
      "https://example.com/?utm_source=x&utm_medium=y&utm_campaign=z&utm_term=a&utm_content=b",
    );
    expect(key).toBe("example.com/");
  });

  it("removes fbclid, gclid, msclkid", () => {
    const { key } = canonicalizeUrl("https://example.com/?fbclid=abc&gclid=def&msclkid=ghi");
    expect(key).toBe("example.com/");
  });

  it("collapses trailing slash on path", () => {
    const { key: a } = canonicalizeUrl("https://github.com/raycast");
    const { key: b } = canonicalizeUrl("https://github.com/raycast/");
    expect(a).toBe(b);
  });

  it("treats http and https as same canonical key (strips scheme from key)", () => {
    const { key: a } = canonicalizeUrl("http://example.com/");
    const { key: b } = canonicalizeUrl("https://example.com/");
    expect(a).toBe(b);
  });

  it("sorts remaining query params for stable key", () => {
    const { key: a } = canonicalizeUrl("https://example.com/?z=1&a=2");
    const { key: b } = canonicalizeUrl("https://example.com/?a=2&z=1");
    expect(a).toBe(b);
  });

  it("falls back to raw URL on invalid URL", () => {
    const raw = "not a url !!";
    expect(canonicalizeUrl(raw)).toEqual({ url: raw, key: raw });
  });
});

describe("dedupeByCanonical", () => {
  function row(url: string, frecency: number, visit_count = 1): MozPlacesRow {
    return { url, title: null, frecency, visit_count };
  }

  it("keeps the highest frecency representative of duplicate canonical URLs", () => {
    const rows = [
      row("https://www.youtube.com/", 100),
      row("https://youtube.com/", 200),
      row("http://www.youtube.com/", 50),
    ];
    const result = dedupeByCanonical(rows);
    expect(result).toHaveLength(1);
    expect(result[0].frecency).toBe(200);
  });

  it("keeps distinct canonical URLs separate", () => {
    const rows = [row("https://github.com/", 100), row("https://youtube.com/", 200)];
    expect(dedupeByCanonical(rows)).toHaveLength(2);
  });

  it("collapses tracking-param variants into one entry", () => {
    const rows = [
      row("https://example.com/?utm_source=google", 100),
      row("https://example.com/?utm_medium=email", 80),
      row("https://example.com/", 60),
    ];
    const result = dedupeByCanonical(rows);
    expect(result).toHaveLength(1);
    expect(result[0].frecency).toBe(100);
  });

  it("returns empty array for empty input", () => {
    expect(dedupeByCanonical([])).toEqual([]);
  });
});
