import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { extractUrls } from "./extractUrls";

describe("extractUrls — TEST-01 30-link fixture", () => {
  const fixture = readFileSync(join(__dirname, "__fixtures__", "notes-doc-30-links.txt"), "utf8");
  const items = extractUrls(fixture);

  it("extracts a substantial set of items (>= 20 unique after dedupe)", () => {
    // Fixture has ~30 listed; one intentional duplicate -> ~24 unique expected.
    expect(items.length).toBeGreaterThanOrEqual(20);
  });

  it("dedupes the repeated https://anthropic.com to a single entry", () => {
    const anthropic = items.filter((i) => i.url === "https://anthropic.com");
    expect(anthropic).toHaveLength(1);
  });

  it("contains a 'web' item for https://anthropic.com", () => {
    expect(items.some((i) => i.type === "web" && i.url === "https://anthropic.com")).toBe(true);
  });

  it("contains a 'web' item for normalized www.example.com -> https://www.example.com", () => {
    expect(items.some((i) => i.url === "https://www.example.com")).toBe(true);
  });

  it("contains a 'web' item for bare-domain fly.io -> https://fly.io", () => {
    expect(items.some((i) => i.url === "https://fly.io")).toBe(true);
  });

  it("contains a 'local-path' item for the ~/-expanded note file", () => {
    expect(items.some((i) => i.type === "local-path" && i.url === `${homedir()}/Documents/meeting-notes.md`)).toBe(
      true,
    );
  });

  it("contains a 'local-path' item for /Users/.../nielsen.html", () => {
    expect(
      items.some(
        (i) => i.type === "local-path" && i.url === "/Users/timothygailey/prototypes/ux-frameworks-diag/nielsen.html",
      ),
    ).toBe(true);
  });

  it("contains a 'local-path' item for the file:// URI", () => {
    expect(items.some((i) => i.type === "local-path" && i.url.startsWith("file://"))).toBe(true);
  });

  it("contains a 'mailto' item for mailto:tim@timgailey.com", () => {
    expect(items.some((i) => i.url === "mailto:tim@timgailey.com")).toBe(true);
  });

  it("contains a 'custom-scheme' item for obsidian://", () => {
    expect(items.some((i) => i.type === "custom-scheme" && i.url.startsWith("obsidian://"))).toBe(true);
  });

  it("contains a 'file-ext' item for docs/architecture.md", () => {
    expect(items.some((i) => i.url === "docs/architecture.md")).toBe(true);
  });

  it("does NOT extract version 1.84", () => {
    expect(items.some((i) => i.url.includes("1.84"))).toBe(false);
  });

  it("does NOT extract bare foo@bar.com (no mailto: prefix)", () => {
    expect(items.some((i) => i.url.includes("foo@bar.com"))).toBe(false);
  });

  it("does NOT extract not.a.real.thing (TLD not allowlisted)", () => {
    expect(items.some((i) => i.url.includes("not.a.real.thing"))).toBe(false);
  });

  it("does NOT extract plain report.pdf without path prefix", () => {
    // The fixture has both `~/Downloads/report.pdf` (extracted by extractAbsPath)
    // AND a bare `report.pdf in folder` line (must NOT extract).
    // Confirm exactly ONE report.pdf-ish item — the absolute-path one.
    const pdfs = items.filter((i) => i.url.endsWith("report.pdf"));
    expect(pdfs).toHaveLength(1);
    expect(pdfs[0].url).toBe(`${homedir()}/Downloads/report.pdf`);
  });

  it("preserves text-position ordering (item indices monotonically increase)", () => {
    for (let n = 1; n < items.length; n++) {
      expect(items[n].index).toBeGreaterThan(items[n - 1].index);
    }
  });

  it("classifies every item with a valid ExtractedType", () => {
    const validTypes = new Set(["web", "local-path", "mailto", "custom-scheme", "file-ext"]);
    for (const item of items) {
      expect(validTypes.has(item.type)).toBe(true);
    }
  });
});

describe("extractUrls — TEST-02 dedupe + ordering snapshot", () => {
  it("dedupes and orders a hand-crafted mixed input", () => {
    // Hand-crafted input:
    // - Three occurrences of https://example.com (one plain, one inside a markdown link,
    //   one plain again) — dedupe must collapse to ONE entry at the FIRST occurrence.
    // - Mixed types interleaved (mailto, custom-scheme).
    // - The markdown-wrapped inner URL must NOT also be matched by extractHttp.
    const input =
      "First https://example.com then [Click](https://example.com) and https://example.com again, plus mailto:a@b.com and obsidian://open";
    const result = extractUrls(input);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "index": 6,
          "raw": "https://example.com",
          "type": "web",
          "url": "https://example.com",
        },
        {
          "index": 96,
          "raw": "mailto:a@b.com",
          "type": "mailto",
          "url": "mailto:a@b.com",
        },
        {
          "index": 115,
          "raw": "obsidian://open",
          "type": "custom-scheme",
          "url": "obsidian://open",
        },
      ]
    `);
  });

  it("dedupes a bare-domain and its www.-prefixed form independently", () => {
    // Per the orchestrator, `www.example.com` -> `https://www.example.com`
    // and bare `example.com` -> `https://example.com`. These are distinct urls; both survive.
    const input = "see www.example.com and example.com";
    const result = extractUrls(input);
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "index": 4,
          "raw": "www.example.com",
          "type": "web",
          "url": "https://www.example.com",
        },
        {
          "index": 24,
          "raw": "example.com",
          "type": "web",
          "url": "https://example.com",
        },
      ]
    `);
  });

  it("markdown inner URL does NOT double-extract via extractHttp", () => {
    // The masking in extractMarkdownLink must prevent extractHttp from re-matching.
    const input = "[A](https://anthropic.com) and https://raycast.com";
    const result = extractUrls(input);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.url)).toEqual(["https://anthropic.com", "https://raycast.com"]);
  });
});
