import { vi } from "vitest";
import { shortenUrl } from "../../services/shorten";

function mockFetch(response: object): void {
  global.fetch = vi.fn().mockResolvedValue(response);
}

describe("shortenUrl dispatcher", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("routing", () => {
    it("routes tinyurl and returns ShortenResult with service 'tinyurl'", async () => {
      mockFetch({
        ok: true,
        text: () => Promise.resolve("https://tinyurl.com/abc123"),
      });

      const result = await shortenUrl("tinyurl", "https://example.com");

      expect(result.service).toBe("tinyurl");
      expect(result.shortUrl).toBe("https://tinyurl.com/abc123");
    });

    it("routes bitly and returns ShortenResult with service 'bitly'", async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
      });

      const result = await shortenUrl(
        "bitly",
        "https://example.com",
        "test-key",
      );

      expect(result.service).toBe("bitly");
      expect(result.shortUrl).toBe("https://bit.ly/abc123");
    });

    it("routes cuttly and returns ShortenResult with service 'cuttly'", async () => {
      mockFetch({
        ok: true,
        json: () =>
          Promise.resolve({
            url: { status: 7, shortLink: "https://cutt.ly/abc123" },
          }),
      });

      const result = await shortenUrl(
        "cuttly",
        "https://example.com",
        "test-key",
      );

      expect(result.service).toBe("cuttly");
      expect(result.shortUrl).toBe("https://cutt.ly/abc123");
    });

    it("routes isgd and returns ShortenResult with service 'isgd'", async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ shorturl: "https://is.gd/abc123" }),
      });

      const result = await shortenUrl("isgd", "https://example.com");

      expect(result.service).toBe("isgd");
      expect(result.shortUrl).toBe("https://is.gd/abc123");
    });

    it("routes vgd and returns ShortenResult with service 'vgd'", async () => {
      mockFetch({
        ok: true,
        json: () => Promise.resolve({ shorturl: "https://v.gd/abc123" }),
      });

      const result = await shortenUrl("vgd", "https://example.com");

      expect(result.service).toBe("vgd");
      expect(result.shortUrl).toBe("https://v.gd/abc123");
    });
  });

  describe("URL normalization", () => {
    it("prepends https:// when no protocol given and passes normalized URL to fetch", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("https://tinyurl.com/abc123"),
      });
      global.fetch = fetchMock;

      const result = await shortenUrl("tinyurl", "example.com");

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("https%3A%2F%2Fexample.com");
      expect(result.originalUrl).toBe("https://example.com");
    });
  });

  describe("ShortenResult structure", () => {
    it("result contains all required fields", async () => {
      mockFetch({
        ok: true,
        text: () => Promise.resolve("https://tinyurl.com/abc123"),
      });

      const result = await shortenUrl("tinyurl", "https://example.com");

      expect(result).toHaveProperty("originalUrl");
      expect(result).toHaveProperty("shortUrl");
      expect(result).toHaveProperty("service");
      expect(result).toHaveProperty("createdAt");
    });

    it("createdAt is a valid ISO date string", async () => {
      mockFetch({
        ok: true,
        text: () => Promise.resolve("https://tinyurl.com/abc123"),
      });

      const result = await shortenUrl("tinyurl", "https://example.com");

      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });
  });

  describe("error cases", () => {
    it("throws 'Unknown service' for unrecognized service id", async () => {
      await expect(
        shortenUrl("unknown", "https://example.com"),
      ).rejects.toThrow("Unknown service");
    });

    it("throws 'requires an API key' for bitly without API key", async () => {
      await expect(shortenUrl("bitly", "https://example.com")).rejects.toThrow(
        "requires an API key",
      );
    });

    it("throws 'requires an API key' for cuttly without API key", async () => {
      await expect(shortenUrl("cuttly", "https://example.com")).rejects.toThrow(
        "requires an API key",
      );
    });
  });
});
