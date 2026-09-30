import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("../src/lib/safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/safe-fetch")>()),
  safeFetch: vi.fn(),
}));

import { HttpError, safeFetch } from "../src/lib/safe-fetch";
import { LinkLoadError, bodyText } from "../src/lib/link-context";
import { decodeHtml } from "../src/lib/charset";
import { loadPageLink, parsePage } from "../src/lib/sources/page";

const bytes = (name: string) => fs.readFileSync(path.join(__dirname, "fixtures/links", name));
const read = (name: string) => bytes(name).toString("utf8");
// A real NASA news release (public domain), recorded 2026-09-30.
const ARTICLE_URL = "https://www.nasa.gov/news-release/nasa-awards-orbital-safety-analysis-support-services-contract/";
const NOW = Date.UTC(2026, 8, 30);

describe("parsePage", () => {
  it("reads the title, site and the article's paragraphs, not the menus", () => {
    const ctx = parsePage(read("article.html"), ARTICLE_URL, NOW);
    expect(ctx).toMatchObject({
      kind: "page",
      key: ARTICLE_URL,
      site: "NASA",
      title: "NASA Awards Orbital Safety Analysis Support Services Contract",
      description: expect.stringContaining("Omitron"),
      thumbnail: expect.stringMatching(/^https:\/\/www\.nasa\.gov\/wp-content\//),
    });
    const text = bodyText(ctx.body);
    expect(text).toContain("Omitron");
    expect(text).not.toMatch(/Skip to main content|Explore\s+Search/);
    expect(ctx.body.type === "paragraphs" && ctx.body.paragraphs.length).toBeGreaterThan(3);
    expect(ctx.facts.find((f) => f.label === "Reading time")?.value).toMatch(/^\d+ min$/);
    expect(ctx.note).toBeUndefined();
  });

  it("says why when a page has almost no text (a JavaScript app)", () => {
    const ctx = parsePage(read("js-only.html"), "https://excalidraw.com/", NOW);
    expect(ctx.title).toMatch(/Excalidraw/);
    expect(ctx.body).toEqual({ type: "paragraphs", paragraphs: [] });
    expect(ctx.note).toBe("Couldn't read this page's text (it may need a login or JavaScript).");
    expect(ctx.noteReason).toBe("unreadable");
  });

  it("reads a windows-1250 Czech article with its author and date", () => {
    const ctx = parsePage(decodeHtml(bytes("cz-article-1250.html"), "text/html"), "https://example.cz/clanek", NOW);
    expect(ctx).toMatchObject({
      title: "Kůň, který uměl číst",
      site: "Zprávy z Třeboně",
      author: "Jiřina Šťastná",
      publishedAt: "2026-09-28",
    });
    expect(bodyText(ctx.body)).toContain("Příliš žluťoučký kůň úpěl ďábelské ódy.");
    expect(bodyText(ctx.body)).not.toContain("Kontakt");
  });

  it("reads JSON-LD when the page has it", () => {
    const html = `<html><head><title>x</title><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Example Daily" },
        {
          "@type": "NewsArticle",
          headline: "Bridges reopen after the storm",
          author: [{ "@type": "Person", name: "Ana Ruiz" }, { name: "Li Wei" }],
          datePublished: "2026-09-12T10:00:00Z",
        },
      ],
    })}</script></head><body><article>${"<p>The storm closed four bridges across the river overnight.</p>".repeat(8)}</article></body></html>`;
    expect(parsePage(html, "https://example.com/storm", NOW)).toMatchObject({
      title: "Bridges reopen after the storm",
      author: "Ana Ruiz, Li Wei",
      publishedAt: "2026-09-12",
    });
  });

  it("keys a page by its URL without the #fragment", () => {
    expect(parsePage(read("article.html"), `${ARTICLE_URL}#comments`, NOW).key).toBe(ARTICLE_URL);
  });
});

describe("loadPageLink", () => {
  it("fetches through safeFetch, decodes the charset and keeps the final URL", async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce({
      url: "https://example.cz/clanek",
      status: 200,
      contentType: "text/html",
      body: bytes("cz-article-1250.html"),
    });
    const ctx = await loadPageLink("http://example.cz/old", {});
    expect(ctx.url).toBe("https://example.cz/clanek");
    expect(bodyText(ctx.body)).toContain("žluťoučký");
    expect(vi.mocked(safeFetch).mock.calls[0][1]).toMatchObject({
      accept: ["text/html", "application/xhtml+xml"],
      maxBytes: 5 * 1024 * 1024,
      timeoutMs: 15_000,
    });
  });

  it("explains a site that won't let apps read it", async () => {
    vi.mocked(safeFetch).mockRejectedValueOnce(new HttpError(403, "www.ft.com"));
    await expect(loadPageLink("https://www.ft.com/content/x", {})).rejects.toThrow(LinkLoadError);
  });

  it("words the refusal for people", async () => {
    vi.mocked(safeFetch).mockRejectedValueOnce(new HttpError(403, "www.ft.com"));
    await expect(loadPageLink("https://www.ft.com/content/x", {})).rejects.toThrow(
      "www.ft.com didn't let The Downloader read this page (HTTP 403). It may need a login or block apps — open it in your browser instead.",
    );
  });
});
