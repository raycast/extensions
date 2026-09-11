import { fetchPageContent, fetchDocEntries } from "../django-docs";
import { fetchSitemap } from "../sitemap";
import { filterTopicsUrls, getSectionParentUrl } from "../../utils/url-filters";
import {
  createTurndownService,
  resolveRelativeUrls,
  removeHeaderLinks,
  stripPilcrows,
} from "../../utils/html-to-markdown";

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("../sitemap");
jest.mock("../../utils/url-filters");
jest.mock("../../utils/html-to-markdown");

const mockedFetchSitemap = fetchSitemap as jest.MockedFunction<typeof fetchSitemap>;
const mockedFilterTopicsUrls = filterTopicsUrls as jest.MockedFunction<typeof filterTopicsUrls>;
const mockedGetSectionParentUrl = getSectionParentUrl as jest.MockedFunction<typeof getSectionParentUrl>;
const mockedCreateTurndownService = createTurndownService as jest.MockedFunction<typeof createTurndownService>;
const mockedResolveRelativeUrls = resolveRelativeUrls as jest.MockedFunction<typeof resolveRelativeUrls>;
const mockedRemoveHeaderLinks = removeHeaderLinks as jest.MockedFunction<typeof removeHeaderLinks>;
const mockedStripPilcrows = stripPilcrows as jest.MockedFunction<typeof stripPilcrows>;

describe("django-docs", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("fetchPageContent", () => {
    const testUrl = "https://docs.djangoproject.com/en/dev/topics/db/models/";

    it("should fetch and parse page content with both navigation links", async () => {
      const htmlContent = `
        <html>
          <head><title>Models | Django</title></head>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../intro/">Previous</a>
              <a rel="next" href="../queries/">Next</a>
            </nav>
            <h1>Models ¶</h1>
            <div id="docs-content">
              <p>This is the content</p>
              <a href="/en/dev/ref/models/fields/">Relative link</a>
            </div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("This is the content\n\n[Relative link](/en/dev/ref/models/fields/)"),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(mockFetch).toHaveBeenCalledWith(testUrl);
      expect(mockedRemoveHeaderLinks).toHaveBeenCalled();
      expect(mockedResolveRelativeUrls).toHaveBeenCalled();
      expect(result.title).toBe("Models");
      expect(result.content).toContain("This is the content");
      expect(result.prevUrl).toBe("https://docs.djangoproject.com/en/dev/topics/db/intro/");
      expect(result.nextUrl).toBe("https://docs.djangoproject.com/en/dev/topics/db/queries/");
    });

    it("should handle fallback navigation when primary navigation is missing", async () => {
      const htmlContent = `
        <html>
          <body>
            <nav aria-labelledby="browse-header"></nav>
            <nav class="browse-horizontal" aria-labelledby="browse-horizontal-header">
              <div class="left"><a rel="prev" href="../fallback-prev/">Previous</a></div>
              <div class="right"><a rel="next" href="../fallback-next/">Next</a></div>
            </nav>
            <h1>Test Page</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Content"),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(result.prevUrl).toBe("https://docs.djangoproject.com/en/dev/topics/db/fallback-prev/");
      expect(result.nextUrl).toBe("https://docs.djangoproject.com/en/dev/topics/db/fallback-next/");
    });

    it("should handle missing navigation links", async () => {
      const htmlContent = `
        <html>
          <body>
            <nav aria-labelledby="browse-header"></nav>
            <h1>First Page</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Content"),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(result.prevUrl).toBeNull();
      expect(result.nextUrl).toBeNull();
    });

    it("should handle missing h1 tag with fallback title", async () => {
      const htmlContent = `
        <html>
          <body>
            <nav aria-labelledby="browse-header"></nav>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Content"),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(result.title).toBe("Untitled");
    });

    it("should handle empty content gracefully", async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Empty Page</h1>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, ""));
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue(""),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(result.content).toBe("");
      expect(result.title).toBe("Empty Page");
    });

    it("should strip pilcrows from title and content", async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Models ¶</h1>
            <div id="docs-content"><p>Content ¶</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Content ¶"),
      } as unknown as ReturnType<typeof createTurndownService>);

      const result = await fetchPageContent(testUrl);

      expect(mockedStripPilcrows).toHaveBeenCalled();
      expect(result.title).toBe("Models");
    });

    it("should resolve relative URLs correctly", async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Test</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
      });
      mockedStripPilcrows.mockImplementation((text) => text);
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Content"),
      } as unknown as ReturnType<typeof createTurndownService>);

      await fetchPageContent(testUrl);

      expect(mockedResolveRelativeUrls).toHaveBeenCalledWith(expect.anything(), testUrl);
    });

    it("should throw error on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(fetchPageContent(testUrl)).rejects.toThrow(`Failed to fetch ${testUrl}: 500 Internal Server Error`);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchPageContent(testUrl)).rejects.toThrow("Network error");
    });
  });

  describe("fetchDocEntries", () => {
    beforeEach(() => {
      mockedStripPilcrows.mockImplementation((text) => text.replace(/¶/g, "").trim());
      mockedCreateTurndownService.mockReturnValue({
        turndown: jest.fn().mockReturnValue("Mocked content"),
      } as unknown as ReturnType<typeof createTurndownService>);
    });

    it("should fetch and process multiple doc entries", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
        "https://docs.djangoproject.com/en/dev/topics/db/queries/",
        "https://docs.djangoproject.com/en/dev/topics/db/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce([...urls, "https://docs.djangoproject.com/en/dev/other/"]);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml = (title: string) => `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../prev/">Previous</a>
              <a rel="next" href="../next/">Next</a>
            </nav>
            <h1>${title}</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Models")) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Queries")) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Database")) });

      mockedGetSectionParentUrl
        .mockReturnValueOnce("https://docs.djangoproject.com/en/dev/topics/db/")
        .mockReturnValueOnce("https://docs.djangoproject.com/en/dev/topics/db/")
        .mockReturnValueOnce(null);

      const entries = await fetchDocEntries("dev");

      expect(mockedFetchSitemap).toHaveBeenCalled();
      expect(mockedFilterTopicsUrls).toHaveBeenCalledWith(expect.any(Array), "dev");
      expect(entries).toHaveLength(3);
      expect(entries[0].title).toBe("Models");
      expect(entries[1].title).toBe("Queries");
      expect(entries[2].title).toBe("Database");
    });

    it("should establish parent-child relationships correctly", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/",
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml = (title: string) => `
        <html>
          <body>
            <h1>${title}</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Database")) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Models")) });

      mockedGetSectionParentUrl
        .mockReturnValueOnce(null)
        .mockReturnValueOnce("https://docs.djangoproject.com/en/dev/topics/db/");

      const entries = await fetchDocEntries("dev");

      expect(entries[0].parent).toBeNull();
      expect(entries[1].parent?.url).toBe(entries[0].url);
      expect(entries[1].parent?.title).toBe(entries[0].title);
    });

    it("should establish previous-next relationships from page content", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
        "https://docs.djangoproject.com/en/dev/topics/db/queries/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml1 = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="next" href="../queries/">Next</a>
            </nav>
            <h1>Models</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      const mockHtml2 = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../models/">Previous</a>
            </nav>
            <h1>Queries</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml1) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml2) });

      mockedGetSectionParentUrl.mockReturnValue(null);

      const entries = await fetchDocEntries("dev");

      expect(entries[0].next?.url).toBe(entries[1].url);
      expect(entries[0].next?.title).toBe(entries[1].title);
      expect(entries[1].previous?.url).toBe(entries[0].url);
      expect(entries[1].previous?.title).toBe(entries[0].title);
    });

    it("should handle entries with no parent when parent URL not in entry list", async () => {
      const urls = ["https://docs.djangoproject.com/en/dev/topics/db/models/"];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml = `
        <html>
          <body>
            <h1>Models</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml) });
      mockedGetSectionParentUrl.mockReturnValueOnce("https://docs.djangoproject.com/en/dev/topics/db/");

      const entries = await fetchDocEntries("dev");

      expect(entries[0].parent).toBeNull();
    });

    it("should handle entries with no previous/next when URLs not in entry list", async () => {
      const urls = ["https://docs.djangoproject.com/en/dev/topics/db/models/"];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../intro/">Previous</a>
              <a rel="next" href="../queries/">Next</a>
            </nav>
            <h1>Models</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml) });
      mockedGetSectionParentUrl.mockReturnValue(null);

      const entries = await fetchDocEntries("dev");

      expect(entries[0].previous).toBeNull();
      expect(entries[0].next).toBeNull();
    });

    it("should throw error when fetching individual pages fails", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
        "https://docs.djangoproject.com/en/dev/topics/db/queries/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      mockedGetSectionParentUrl.mockReturnValue(null);

      await expect(fetchDocEntries("dev")).rejects.toThrow(`Failed to fetch ${urls[0]}: 500 Internal Server Error`);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle empty sitemap", async () => {
      mockedFetchSitemap.mockResolvedValueOnce([]);
      mockedFilterTopicsUrls.mockReturnValueOnce([]);

      const entries = await fetchDocEntries("dev");

      expect(entries).toHaveLength(0);
    });

    it("should handle sitemap with no matching URLs after filtering", async () => {
      mockedFetchSitemap.mockResolvedValueOnce([
        "https://docs.djangoproject.com/en/dev/other/",
        "https://docs.djangoproject.com/en/dev/faq/",
      ]);
      mockedFilterTopicsUrls.mockReturnValueOnce([]);

      const entries = await fetchDocEntries("dev");

      expect(entries).toHaveLength(0);
    });

    it("should maintain proper URL mapping for relationships", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/intro/",
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
        "https://docs.djangoproject.com/en/dev/topics/db/queries/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml1 = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="next" href="../models/">Next</a>
            </nav>
            <h1>Intro</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      const mockHtml2 = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../intro/">Previous</a>
              <a rel="next" href="../queries/">Next</a>
            </nav>
            <h1>Models</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      const mockHtml3 = `
        <html>
          <body>
            <nav aria-labelledby="browse-header">
              <a rel="prev" href="../models/">Previous</a>
            </nav>
            <h1>Queries</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml1) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml2) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml3) });

      mockedGetSectionParentUrl.mockReturnValue(null);

      const entries = await fetchDocEntries("dev");

      expect(entries[0].next?.url).toBe(entries[1].url);
      expect(entries[1].previous?.url).toBe(entries[0].url);
      expect(entries[1].next?.url).toBe(entries[2].url);
      expect(entries[2].previous?.url).toBe(entries[1].url);
    });

    it("should process all entries sequentially", async () => {
      const urls = [
        "https://docs.djangoproject.com/en/dev/topics/db/models/",
        "https://docs.djangoproject.com/en/dev/topics/db/queries/",
      ];

      mockedFetchSitemap.mockResolvedValueOnce(urls);
      mockedFilterTopicsUrls.mockReturnValueOnce(urls);

      const mockHtml = (title: string) => `
        <html>
          <body>
            <h1>${title}</h1>
            <div id="docs-content"><p>Content</p></div>
          </body>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Models")) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(mockHtml("Queries")) });

      mockedGetSectionParentUrl.mockReturnValue(null);

      await fetchDocEntries("dev");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, urls[0]);
      expect(mockFetch).toHaveBeenNthCalledWith(2, urls[1]);
    });
  });
});
