import { describe, it, expect, vi } from "vitest";

// Mock @raycast/api before importing article utilities
vi.mock("@raycast/api", () => ({
  Color: {},
  Icon: { Globe: "globe-icon" },
  Image: {},
}));

import {
  stripHtml,
  getArticleUrl,
  resolvePublishedDate,
  cleanDescription,
  formatAuthors,
  extractTags,
  getTagColor,
  getArticleIcon,
  FALLBACK_URL,
  DEFAULT_METADATA_PLACEHOLDER,
} from "../utils/article";
import { Article } from "../api/type";

// Helper to create a minimal article
function makeArticle(overrides: Partial<Article> = {}): Article {
  return { id: 1, titulo: "Test", url: "/test-123456", ...overrides };
}

// --- stripHtml ---

describe("stripHtml", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHtml("1 &lt; 2 &gt; 0")).toBe("1 < 2 > 0");
    expect(stripHtml("&quot;quoted&quot;")).toBe('"quoted"');
    expect(stripHtml("it&#39;s")).toBe("it's");
    expect(stripHtml("&apos;apos&apos;")).toBe("'apos'");
    expect(stripHtml("no&nbsp;break")).toBe("no break");
  });

  it("handles combined tags and entities", () => {
    expect(stripHtml("<p>A &amp; B</p>")).toBe("A & B");
  });

  it("trims whitespace", () => {
    expect(stripHtml("  <br> hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("passes through plain text unchanged", () => {
    expect(stripHtml("no html here")).toBe("no html here");
  });
});

// --- getArticleUrl ---

describe("getArticleUrl", () => {
  it("returns fullUrl if available", () => {
    const article = makeArticle({ fullUrl: "https://example.com/article" });
    expect(getArticleUrl(article)).toBe("https://example.com/article");
  });

  it("returns fallback URL if url is empty", () => {
    const article = makeArticle({ url: "" });
    expect(getArticleUrl(article)).toBe(FALLBACK_URL);
  });

  it("fixes double-protocol URLs (pthttps//)", () => {
    const article = makeArticle({
      url: "https://www.publico.pthttps//www.example.com/article",
    });
    expect(getArticleUrl(article)).toBe("https://www.example.com/article");
  });

  it("fixes double-protocol URLs (pthttps/)", () => {
    const article = makeArticle({
      url: "https://www.publico.pthttps/www.example.com/article",
    });
    expect(getArticleUrl(article)).toBe("https://www.example.com/article");
  });

  it("fixes https// without colon", () => {
    const article = makeArticle({ url: "https//www.publico.pt/article" });
    expect(getArticleUrl(article)).toBe("https://www.publico.pt/article");
  });

  it("prepends FALLBACK_URL for relative paths with leading slash", () => {
    const article = makeArticle({ url: "/noticia/test-123" });
    expect(getArticleUrl(article)).toBe(`${FALLBACK_URL}/noticia/test-123`);
  });

  it("prepends FALLBACK_URL with slash for relative paths without leading slash", () => {
    const article = makeArticle({ url: "noticia/test-123" });
    expect(getArticleUrl(article)).toBe(`${FALLBACK_URL}/noticia/test-123`);
  });

  it("passes through valid absolute publico.pt URLs", () => {
    const article = makeArticle({
      url: "https://www.publico.pt/noticia/test-123",
    });
    expect(getArticleUrl(article)).toBe(
      "https://www.publico.pt/noticia/test-123",
    );
  });
});

// --- resolvePublishedDate ---

describe("resolvePublishedDate", () => {
  it("returns formatted date from data field", () => {
    const article = makeArticle({ data: "2024-03-15T10:30:00Z" });
    const result = resolvePublishedDate(article);
    expect(result).toContain("2024");
    expect(result).not.toMatch(/Invalid|NaN/);
  });

  it("falls back to time field if data is missing", () => {
    const article = makeArticle({ time: "2024-03-15T10:30:00Z" });
    const result = resolvePublishedDate(article);
    expect(result).not.toBe(DEFAULT_METADATA_PLACEHOLDER);
  });

  it("returns placeholder for missing timestamps", () => {
    const article = makeArticle({});
    expect(resolvePublishedDate(article)).toBe(DEFAULT_METADATA_PLACEHOLDER);
  });

  it("returns placeholder for invalid date prefix 0001-01-01", () => {
    const article = makeArticle({ data: "0001-01-01T00:00:00Z" });
    expect(resolvePublishedDate(article)).toBe(DEFAULT_METADATA_PLACEHOLDER);
  });
});

// --- cleanDescription ---

describe("cleanDescription", () => {
  it("returns empty string for undefined", () => {
    expect(cleanDescription(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(cleanDescription("")).toBe("");
  });

  it("strips 'há X horas...' prefix", () => {
    expect(cleanDescription("há 2 horas... Article text here")).toBe(
      "Article text here",
    );
  });

  it("strips 'há X dias...' prefix", () => {
    expect(cleanDescription("há 3 dias... Some content")).toBe("Some content");
  });

  it("strips 'há X semanas…' prefix with ellipsis character", () => {
    expect(cleanDescription("há 1 semana… Weekly recap")).toBe("Weekly recap");
  });

  it("passes through descriptions without time prefix", () => {
    expect(cleanDescription("Normal description text")).toBe(
      "Normal description text",
    );
  });
});

describe("summary rendering contract", () => {
  it("relies on the caller to strip markup that cleanDescription leaves", () => {
    // cleanDescription removes the "há N horas" prefix; removing tags is
    // stripHtml's job. Live opiniao items carry <em>, <p> and
    // <span style="font-family: Georgia..."> inside descricao, so
    // ArticleListItem must call both or that markup renders as text.
    expect(cleanDescription("Um <em>email</em> que me enviou")).toContain(
      "<em>",
    );
    expect(stripHtml(cleanDescription("Um <em>email</em> que me enviou"))).toBe(
      "Um email que me enviou",
    );
  });
});

// --- formatAuthors ---

describe("formatAuthors", () => {
  it("returns placeholder for undefined", () => {
    expect(formatAuthors(undefined)).toBe(DEFAULT_METADATA_PLACEHOLDER);
  });

  it("extracts nome from array of authors", () => {
    expect(
      formatAuthors([
        { nome: "Alice", name: "alice" },
        { nome: "Bob", name: "bob" },
      ]),
    ).toBe("Alice, Bob");
  });

  it("extracts nome from single author object", () => {
    expect(formatAuthors({ nome: "Alice" })).toBe("Alice");
  });

  it("falls back to name if nome is missing", () => {
    expect(formatAuthors([{ nome: "", name: "Fallback Name" }])).toBe(
      "Fallback Name",
    );
  });

  it("returns placeholder for empty array", () => {
    expect(formatAuthors([])).toBe(DEFAULT_METADATA_PLACEHOLDER);
  });

  it("returns placeholder for author with no extractable name", () => {
    expect(formatAuthors({ nome: "" })).toBe(DEFAULT_METADATA_PLACEHOLDER);
  });
});

// --- extractTags ---

describe("extractTags", () => {
  it("returns empty array for undefined", () => {
    expect(extractTags(undefined)).toEqual([]);
  });

  it("extracts string tags from array", () => {
    expect(extractTags(["politics", "economy"])).toEqual([
      "politics",
      "economy",
    ]);
  });

  it("extracts nome from tag objects", () => {
    expect(extractTags([{ nome: "Política" }, { nome: "Economia" }])).toEqual([
      "Política",
      "Economia",
    ]);
  });

  it("filters out 'undefined', 'null', and '[object Object]' strings", () => {
    expect(
      extractTags(["valid", "undefined", "null", "[object Object]"]),
    ).toEqual(["valid"]);
  });

  it("handles single string tag", () => {
    expect(extractTags("single-tag")).toEqual(["single-tag"]);
  });

  it("handles single tag object", () => {
    expect(extractTags({ nome: "TagName" })).toEqual(["TagName"]);
  });

  it("filters empty strings from results", () => {
    expect(extractTags(["", "valid", ""])).toEqual(["valid"]);
  });

  it("falls back to name, value, titulo, title fields", () => {
    expect(extractTags([{ name: "ByName" }])).toEqual(["ByName"]);
    expect(extractTags([{ value: "ByValue" }])).toEqual(["ByValue"]);
    expect(extractTags([{ titulo: "ByTitulo" }])).toEqual(["ByTitulo"]);
    expect(extractTags([{ title: "ByTitle" }])).toEqual(["ByTitle"]);
  });
});

// --- getTagColor ---

describe("getTagColor", () => {
  it("cycles through the palette rather than running off the end", () => {
    // The palette is Raycast's semantic Color tokens, which adapt to the
    // user's theme. Do not assert specific values: a Raycast reviewer already
    // replaced hardcoded hex with these once, and the count changed with it.
    // Assert the periodic behaviour instead, which survives palette edits.
    const first = getTagColor(0);
    let period = 0;
    for (let i = 1; i <= 64; i += 1) {
      if (getTagColor(i) === first) {
        period = i;
        break;
      }
    }
    expect(period).toBeGreaterThan(0);
    expect(getTagColor(period)).toBe(first);
    expect(getTagColor(period * 3)).toBe(first);
  });

  it("never returns undefined, even far out of range", () => {
    for (const index of [0, 1, 6, 7, 13, 9999]) {
      expect(getTagColor(index)).toBe(getTagColor(index));
    }
  });
});

// --- getArticleIcon ---

describe("getArticleIcon", () => {
  it("returns multimediaPrincipal string as source", () => {
    const article = makeArticle({
      multimediaPrincipal: "https://img.com/1.jpg",
    });
    expect(getArticleIcon(article)).toEqual({
      source: "https://img.com/1.jpg",
    });
  });

  it("returns multimediaPrincipal.src from object", () => {
    const article = makeArticle({
      multimediaPrincipal: { src: "https://img.com/2.jpg" },
    });
    expect(getArticleIcon(article)).toEqual({
      source: "https://img.com/2.jpg",
    });
  });

  it("falls back to imagem.src", () => {
    const article = makeArticle({
      imagem: { src: "https://img.com/3.jpg" },
    });
    expect(getArticleIcon(article)).toEqual({
      source: "https://img.com/3.jpg",
    });
  });

  it("returns globe icon as fallback", () => {
    const article = makeArticle({});
    const icon = getArticleIcon(article);
    expect(icon).toHaveProperty("source", "globe-icon");
  });
});
