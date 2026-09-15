import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const httpsGet = vi.fn();

vi.mock("node:https", () => ({ get: httpsGet }));
vi.mock("https", () => ({ get: httpsGet }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ postsPerPage: "30", maxPosts: "35" }),
  LocalStorage: {
    getItem: vi.fn(async (key: string) => storage.get(key)),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
  showToast: vi.fn(),
  Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
}));

function feed(page: number, count = 20) {
  const items = Array.from({ length: count }, (_, index) => {
    const id = (page - 1) * count + index + 1;
    return `<item><title>Article ${id}</title><link>https://example.com/${id}</link><guid>article-${id}</guid><pubDate>Mon, 15 Sep 2026 08:00:00 GMT</pubDate><description>Body ${id}</description></item>`;
  }).join("");
  return `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
}

function mockFeedServer() {
  httpsGet.mockImplementation((url: string, _options: unknown, callback: (response: EventEmitter) => void) => {
    const request = new EventEmitter() as EventEmitter & {
      destroy: () => void;
      getHeader: () => undefined;
      setTimeout: () => void;
    };
    request.destroy = vi.fn();
    request.getHeader = () => undefined;
    request.setTimeout = vi.fn();

    const response = new EventEmitter() as EventEmitter & {
      headers: Record<string, string>;
      resume: () => void;
      setEncoding: () => void;
      statusCode: number;
    };
    response.headers = {};
    response.resume = vi.fn();
    response.setEncoding = vi.fn();
    response.statusCode = 200;
    const page = Number(new URL(url).searchParams.get("paged"));

    queueMicrotask(() => {
      callback(response);
      response.emit("data", feed(page));
      response.emit("end");
    });

    return request;
  });
}

describe("fetchArticles", () => {
  beforeEach(() => {
    storage.clear();
    httpsGet.mockReset();
    mockFeedServer();
  });

  it("keeps paging when WordPress returns fewer items than requested", async () => {
    const { fetchArticles } = await import("../src/utils");

    const articles = await fetchArticles(false);

    expect(articles).toHaveLength(35);
    expect(httpsGet).toHaveBeenCalledTimes(2);
  });

  it("ignores a structurally invalid cached article list", async () => {
    storage.set("cached_articles_v2", JSON.stringify({ articles: [{}], timestamp: Date.now() }));
    const { fetchArticles } = await import("../src/utils");

    await expect(fetchArticles(false)).resolves.toHaveLength(35);
    expect(httpsGet).toHaveBeenCalledTimes(2);
  });

  it("returns stale valid cache data when the feed refresh fails", async () => {
    const cachedArticle = {
      title: "Cached article",
      link: "https://stadt-bremerhaven.de/cached",
      pubDate: "Mon, 15 Sep 2026 08:00:00 GMT",
      description: "Cached body",
    };
    storage.set(
      "cached_articles_v2",
      JSON.stringify({ articles: [cachedArticle], timestamp: Date.now() - 11 * 60 * 1000 }),
    );
    httpsGet.mockReset();
    httpsGet.mockImplementation(() => {
      const request = new EventEmitter() as EventEmitter & {
        destroy: () => void;
        setTimeout: () => void;
      };
      request.destroy = vi.fn();
      request.setTimeout = vi.fn();
      queueMicrotask(() => request.emit("error", new Error("offline")));
      return request;
    });
    const { fetchArticles } = await import("../src/utils");

    await expect(fetchArticles(false)).resolves.toEqual([cachedArticle]);
  });
});

describe("safeParseDate", () => {
  it("returns zero for an invalid date", async () => {
    const { safeParseDate } = await import("../src/utils");
    expect(safeParseDate("not-a-date")).toBe(0);
  });
});

describe("truncateText", () => {
  it("decodes entities that were escaped inside the RSS payload", async () => {
    const { truncateText } = await import("../src/utils");
    expect(truncateText("&amp;#160;Hello &amp;amp; welcome", 100)).toBe("Hello & welcome");
  });

  it("handles named and invalid numeric HTML entities safely", async () => {
    const { truncateText } = await import("../src/utils");
    expect(truncateText("One &hellip; two &#9999999999; three", 100)).toBe("One … two � three");
  });
});

describe("htmlToMarkdown", () => {
  it("keeps paragraphs and list items readable without raw HTML", async () => {
    const { htmlToMarkdown } = await import("../src/utils");
    expect(htmlToMarkdown("<p>Hello &amp; welcome</p><ul><li>First</li><li>Second</li></ul>")).toBe(
      "Hello & welcome\n\n- First\n- Second",
    );
  });

  it("removes scripts and styles from article content", async () => {
    const { htmlToMarkdown } = await import("../src/utils");
    expect(htmlToMarkdown("<style>.bad{}</style><p>Text</p><script>alert(1)</script>")).toBe("Text");
  });
});
