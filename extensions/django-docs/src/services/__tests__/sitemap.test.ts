import { fetchSitemap } from "../sitemap";
import { SITEMAP_URL } from "../../constants";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("sitemap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchSitemap", () => {
    it("should fetch and parse URLs from sitemap", async () => {
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.djangoproject.com/en/dev/topics/http/</loc>
  </url>
  <url>
    <loc>https://docs.djangoproject.com/en/dev/ref/models/</loc>
  </url>
  <url>
    <loc>https://docs.djangoproject.com/en/dev/intro/tutorial01/</loc>
  </url>
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap();

      expect(mockFetch).toHaveBeenCalledWith(SITEMAP_URL);
      expect(urls).toEqual([
        "https://docs.djangoproject.com/en/dev/topics/http/",
        "https://docs.djangoproject.com/en/dev/ref/models/",
        "https://docs.djangoproject.com/en/dev/intro/tutorial01/",
      ]);
    });

    it("should use custom sitemap URL when provided", async () => {
      const customUrl = "https://example.com/custom-sitemap.xml";
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1</loc>
  </url>
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap(customUrl);

      expect(mockFetch).toHaveBeenCalledWith(customUrl);
      expect(urls).toEqual(["https://example.com/page1"]);
    });

    it("should return empty array when sitemap has no URLs", async () => {
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap();

      expect(urls).toEqual([]);
    });

    it("should handle sitemap with multiple loc elements per url", async () => {
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.djangoproject.com/en/dev/topics/http/</loc>
    <lastmod>2024-01-01</lastmod>
  </url>
  <url>
    <loc>https://docs.djangoproject.com/en/dev/ref/models/</loc>
    <lastmod>2024-01-02</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap();

      expect(urls).toEqual([
        "https://docs.djangoproject.com/en/dev/topics/http/",
        "https://docs.djangoproject.com/en/dev/ref/models/",
      ]);
    });

    it("should handle sitemap with whitespace in loc elements", async () => {
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>
      https://docs.djangoproject.com/en/dev/topics/http/
    </loc>
  </url>
  <url>
    <loc>  https://docs.djangoproject.com/en/dev/ref/models/  </loc>
  </url>
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap();

      expect(urls).toEqual([
        "https://docs.djangoproject.com/en/dev/topics/http/",
        "https://docs.djangoproject.com/en/dev/ref/models/",
      ]);
    });

    it("should throw error on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(fetchSitemap()).rejects.toThrow("Failed to fetch sitemap: 500 Internal Server Error");
      expect(mockFetch).toHaveBeenCalledWith(SITEMAP_URL);
    });

    it("should propagate network errors", async () => {
      const error = new Error("Network error");
      mockFetch.mockRejectedValueOnce(error);

      await expect(fetchSitemap()).rejects.toThrow("Network error");
      expect(mockFetch).toHaveBeenCalledWith(SITEMAP_URL);
    });

    it("should handle malformed XML gracefully", async () => {
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://docs.djangoproject.com/en/dev/topics/http/</loc>
  </url>
  <url>
    <loc>https://docs.djangoproject.com/en/dev/ref/models/</loc>
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const urls = await fetchSitemap();

      expect(urls.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });

      const urls = await fetchSitemap();

      expect(urls).toEqual([]);
    });

    it("should handle large sitemaps with many URLs", async () => {
      const urls = Array.from({ length: 1000 }, (_, i) => `https://example.com/page${i}`);
      const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockSitemapXml),
      });

      const result = await fetchSitemap();

      expect(result).toHaveLength(1000);
      expect(result[0]).toBe("https://example.com/page0");
      expect(result[999]).toBe("https://example.com/page999");
    });
  });
});
