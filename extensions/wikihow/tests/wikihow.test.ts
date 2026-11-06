import { describe, expect, it, vi } from "vitest";
import {
  articleMarkdown,
  articleUrl,
  buildSearchUrl,
  parseSearchResponse,
  plainText,
  searchArticles,
  WikiHowSearchError,
} from "../src/lib/wikihow";

// Synthetic provider data; these are not fetched wikiHow article excerpts.
const response = {
  type: "search",
  query: { more_results_available: true },
  web: {
    results: [
      {
        title: "Example &amp; Guide - wikiHow",
        url: "https://www.wikihow.com/Example-Guide?tracking=test#Steps",
        description: "An <strong>example</strong> search excerpt.",
        extra_snippets: ["Another excerpt.", "Another excerpt.", "", "An example search excerpt."],
      },
      { title: "Duplicate", url: "https://wikihow.com/Example-Guide" },
      { title: "Wrong site", url: "https://example.com/a" },
      { title: "Category", url: "https://www.wikihow.com/Category:Examples" },
      { title: "No excerpt", url: "https://www.wikihow.com/Second-Example", description: null },
    ],
  },
};

describe("wikiHow result boundaries", () => {
  it("accepts HTTPS English article URLs and removes tracking parameters", () => {
    expect(articleUrl("https://wikihow.com/Tie-a-Tie?a=1#Steps")).toBe("https://www.wikihow.com/Tie-a-Tie");
  });

  it.each([
    "http://www.wikihow.com/Guide",
    "https://www.wikihow.com.evil.example/Guide",
    "https://evil.example/Guide",
    "https://user:secret@www.wikihow.com/Guide",
    "https://www.wikihow.com:8080/Guide",
    "https://www.wikihow.com/",
    "https://www.wikihow.com/Category:Examples",
    "https://www.wikihow.com/Special%3ALSearch",
    "https://www.wikihow.com/index.php?title=Guide",
    "https://www.wikihow.com/api.php",
    "https://www.wikihow.com/Main-Page",
    "https://www.wikihow.com/Terms-of-Use",
    "https://www.wikihow.com/Guide%2Fevil",
    "javascript:alert(1)",
    "not a URL",
  ])("rejects non-article destinations: %s", (url) => {
    expect(articleUrl(url)).toBeUndefined();
  });

  it("filters external and duplicate results, cleans HTML and deduplicates excerpts", () => {
    const page = parseSearchResponse(response, 0);
    expect(page.articles).toHaveLength(2);
    expect(page.articles[0]).toEqual({
      title: "Example & Guide - wikiHow",
      url: "https://www.wikihow.com/Example-Guide",
      excerpt: "An example search excerpt.",
      extraExcerpts: ["Another excerpt."],
    });
    expect(page.articles[1].excerpt).toBe("");
    expect(page.hasMore).toBe(true);
  });

  it("bounds pagination to the documented ten-page limit", () => {
    expect(parseSearchResponse(response, 9).hasMore).toBe(false);
    expect(parseSearchResponse({ ...response, query: {} }, 0).hasMore).toBe(false);
  });

  it("supports valid zero-result responses without silently accepting malformed payloads", () => {
    expect(parseSearchResponse({ type: "search", query: {} }, 0).articles).toEqual([]);
    expect(() => parseSearchResponse({ error: "provider failure" }, 0)).toThrow(WikiHowSearchError);
    expect(() => parseSearchResponse({ type: "search", web: { results: {} } }, 0)).toThrow(WikiHowSearchError);
  });

  it("renders excerpts as escaped text with a clear full-article boundary", () => {
    const article = {
      title: "[Bad](javascript:alert(1))",
      url: "https://www.wikihow.com/Example",
      excerpt: "![Image](https://evil.example/x) <tag>",
      extraExcerpts: [],
    };
    const md = articleMarkdown(article);
    expect(md).toContain("Search excerpts, not the full article");
    expect(md).toContain("\\!\\[Image\\]\\(https://evil");
    expect(md).toContain("[Read the full article on wikiHow](https://www.wikihow.com/Example)");
  });

  it("decodes common and numeric HTML entities and removes script text", () => {
    expect(plainText("<script>alert(1)</script>one&nbsp;&amp; two&#x27;s &#128512;")).toBe("one & two's 😀");
    expect(plainText(null)).toBe("");
    expect(plainText("&#999999999;")).toBe("�");
  });

  it("renders provider-encoded HTML as literal text rather than raw angle markup", () => {
    const page = parseSearchResponse(
      {
        type: "search",
        web: {
          results: [
            {
              title: "Example Guide",
              url: "https://www.wikihow.com/Example-Guide",
              description: '&lt;img src="https://tracker.example/image"&gt;',
            },
          ],
        },
      },
      0,
    );
    const md = articleMarkdown(page.articles[0]);
    expect(md).toContain('\\<img src="https://tracker\\.example/image"\\>');
    expect(md).not.toMatch(/(?<!\\)<[^>]+>/);
  });
});

describe("supported Brave request contract", () => {
  it("scopes search to wikiHow and requests only English web results with extra excerpts", () => {
    const url = buildSearchUrl(" tie a tie ", 2);
    expect(url.origin + url.pathname).toBe("https://api.search.brave.com/res/v1/web/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "site:www.wikihow.com tie a tie",
      count: "20",
      offset: "2",
      search_lang: "en",
      safesearch: "moderate",
      extra_snippets: "true",
      text_decorations: "false",
      result_filter: "web",
    });
  });

  it.each(["", " ", "x".repeat(600), Array(76).fill("word").join(" ")])(
    "rejects invalid queries before requesting",
    (query) => {
      expect(() => buildSearchUrl(query, 0)).toThrow(WikiHowSearchError);
    },
  );

  it.each([-1, 10, 0.5])("rejects unsupported page %s", (page) => {
    expect(() => buildSearchUrl("example", page)).toThrow(WikiHowSearchError);
  });

  it("keeps the secret in the request header and disables redirects", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    const page = await searchArticles("example", 0, " secret-key ", undefined, fetcher);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain("secret-key");
    expect(init?.headers).toEqual({ Accept: "application/json", "X-Subscription-Token": "secret-key" });
    expect(init?.redirect).toBe("error");
    expect(page.articles).toHaveLength(2);
  });

  it("does not make a request without a key", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(searchArticles("example", 0, "", undefined, fetcher)).rejects.toMatchObject({ code: "missing-key" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403])("gives a safe actionable error for HTTP %s", async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("secret-key should never be echoed", { status }));
    await expect(searchArticles("example", 0, "secret-key", undefined, fetcher)).rejects.toMatchObject({
      code: "auth",
    });
  });

  it("preserves Retry-After and never automatically retries a rate-limited request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "12" } }));
    await expect(searchArticles("example", 0, "key", undefined, fetcher)).rejects.toMatchObject({
      code: "rate-limit",
      retryAfterSeconds: 12,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([422, 500, 503])("handles non-success HTTP %s without leaking the provider body", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("secret-key", { status }));
    try {
      await searchArticles("example", 0, "secret-key", undefined, fetcher);
      expect.fail("Expected an HTTP error");
    } catch (error) {
      expect(error).toBeInstanceOf(WikiHowSearchError);
      expect((error as Error).message).not.toContain("secret-key");
    }
  });

  it("handles invalid JSON and unexpected successful payloads", async () => {
    for (const body of ["not json", JSON.stringify({ type: "ErrorResponse" })]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 200 }));
      await expect(searchArticles("example", 0, "key", undefined, fetcher)).rejects.toMatchObject({ code: "response" });
    }
  });

  it("handles network errors without exposing an arbitrary exception", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("secret-key"));
    await expect(searchArticles("example", 0, "secret-key", undefined, fetcher)).rejects.toMatchObject({
      code: "network",
      message: "Could not reach Brave Search. Check your connection and try again.",
    });
  });

  it("preserves cancellation so an obsolete response is not shown as an error", async () => {
    const controller = new AbortController();
    const error = new Error("cancelled");
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      throw error;
    });
    await expect(searchArticles("example", 0, "key", controller.signal, fetcher)).rejects.toBe(error);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
