import { describe, it, expect } from "vitest";
import { UrlProcessor } from "../url-processor";

describe("UrlProcessor", () => {
  describe("isValidUrl", () => {
    it("should return true for valid HTTP URLs", () => {
      expect(UrlProcessor.isValidUrl("http://example.com")).toBe(true);
      expect(UrlProcessor.isValidUrl("http://example.com/path")).toBe(true);
      expect(UrlProcessor.isValidUrl("http://subdomain.example.com")).toBe(true);
    });

    it("should return true for valid HTTPS URLs", () => {
      expect(UrlProcessor.isValidUrl("https://example.com")).toBe(true);
      expect(UrlProcessor.isValidUrl("https://example.com/path")).toBe(true);
      expect(UrlProcessor.isValidUrl("https://subdomain.example.com")).toBe(true);
    });

    it("should return true for URLs with query parameters", () => {
      expect(UrlProcessor.isValidUrl("https://example.com?param=value")).toBe(true);
      expect(UrlProcessor.isValidUrl("https://example.com/path?id=123&ref=twitter")).toBe(true);
    });

    it("should return true for URLs with fragments", () => {
      expect(UrlProcessor.isValidUrl("https://example.com#section")).toBe(true);
      expect(UrlProcessor.isValidUrl("https://example.com/path#section1")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(UrlProcessor.isValidUrl("not-a-url")).toBe(false);
      expect(UrlProcessor.isValidUrl("ftp://example.com")).toBe(false);
      expect(UrlProcessor.isValidUrl("mailto:test@example.com")).toBe(false);
      expect(UrlProcessor.isValidUrl("")).toBe(false);
      expect(UrlProcessor.isValidUrl("   ")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(UrlProcessor.isValidUrl(null as unknown as string)).toBe(false);
      expect(UrlProcessor.isValidUrl(undefined as unknown as string)).toBe(false);
    });

    it("should handle URLs with special characters", () => {
      expect(UrlProcessor.isValidUrl("https://example.com/path with spaces")).toBe(false);
      expect(UrlProcessor.isValidUrl("https://example.com/path%20with%20encoded%20spaces")).toBe(true);
    });
  });

  describe("formatForService", () => {
    it("should format URL correctly for paywall service", () => {
      const targetUrl = "https://example.com/article";
      const serviceUrl = "https://open.bolha.tools";
      const expected = "https://open.bolha.tools/https://example.com/article";

      expect(UrlProcessor.formatForService(targetUrl, serviceUrl)).toBe(expected);
    });

    it("should handle service URL with trailing slash", () => {
      const targetUrl = "https://example.com/article";
      const serviceUrl = "https://open.bolha.tools/";
      const expected = "https://open.bolha.tools/https://example.com/article";

      expect(UrlProcessor.formatForService(targetUrl, serviceUrl)).toBe(expected);
    });

    it("should format URLs with query parameters", () => {
      const targetUrl = "https://example.com/article?id=123&ref=twitter";
      const serviceUrl = "https://open.bolha.tools";
      const expected = "https://open.bolha.tools/https://example.com/article?id=123&ref=twitter";

      expect(UrlProcessor.formatForService(targetUrl, serviceUrl)).toBe(expected);
    });

    it("should throw error for invalid target URL", () => {
      const serviceUrl = "https://open.bolha.tools";

      expect(() => UrlProcessor.formatForService("invalid-url", serviceUrl)).toThrow("Invalid target URL provided");
    });

    it("should throw error for invalid service URL", () => {
      const targetUrl = "https://example.com/article";

      expect(() => UrlProcessor.formatForService(targetUrl, "invalid-service")).toThrow("Invalid service URL provided");
    });
  });

  describe("isValidServiceUrl", () => {
    it("should return true for valid service URLs", () => {
      expect(UrlProcessor.isValidServiceUrl("https://open.bolha.tools")).toBe(true);
      expect(UrlProcessor.isValidServiceUrl("http://localhost:3000")).toBe(true);
      expect(UrlProcessor.isValidServiceUrl("https://my-service.com/api")).toBe(true);
    });

    it("should return false for invalid service URLs", () => {
      expect(UrlProcessor.isValidServiceUrl("not-a-url")).toBe(false);
      expect(UrlProcessor.isValidServiceUrl("")).toBe(false);
      expect(UrlProcessor.isValidServiceUrl("ftp://service.com")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(UrlProcessor.isValidServiceUrl(null as unknown as string)).toBe(false);
      expect(UrlProcessor.isValidServiceUrl(undefined as unknown as string)).toBe(false);
    });
  });

  describe("extractDomain", () => {
    it("should extract domain from valid URLs", () => {
      expect(UrlProcessor.extractDomain("https://example.com")).toBe("example.com");
      expect(UrlProcessor.extractDomain("https://subdomain.example.com/path")).toBe("subdomain.example.com");
      expect(UrlProcessor.extractDomain("http://localhost:3000")).toBe("localhost");
    });

    it("should return null for invalid URLs", () => {
      expect(UrlProcessor.extractDomain("invalid-url")).toBeNull();
      expect(UrlProcessor.extractDomain("")).toBeNull();
    });
  });

  describe("normalizeUrl", () => {
    it("should remove fragment from URL", () => {
      const url = "https://example.com/article#section1";
      const expected = "https://example.com/article";

      expect(UrlProcessor.normalizeUrl(url)).toBe(expected);
    });

    it("should keep query parameters", () => {
      const url = "https://example.com/article?id=123&ref=twitter";

      expect(UrlProcessor.normalizeUrl(url)).toBe(url);
    });

    it("should remove fragment but keep query parameters", () => {
      const url = "https://example.com/article?id=123#section1";
      const expected = "https://example.com/article?id=123";

      expect(UrlProcessor.normalizeUrl(url)).toBe(expected);
    });

    it("should throw error for invalid URLs", () => {
      expect(() => UrlProcessor.normalizeUrl("invalid-url")).toThrow("Invalid URL provided for normalization");
    });
  });

  describe("hasQueryParameters", () => {
    it("should return true for URLs with query parameters", () => {
      expect(UrlProcessor.hasQueryParameters("https://example.com?param=value")).toBe(true);
      expect(UrlProcessor.hasQueryParameters("https://example.com/path?id=123&ref=twitter")).toBe(true);
    });

    it("should return false for URLs without query parameters", () => {
      expect(UrlProcessor.hasQueryParameters("https://example.com")).toBe(false);
      expect(UrlProcessor.hasQueryParameters("https://example.com/path")).toBe(false);
      expect(UrlProcessor.hasQueryParameters("https://example.com#fragment")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(UrlProcessor.hasQueryParameters("invalid-url")).toBe(false);
    });
  });

  describe("extractQueryParameters", () => {
    it("should extract query parameters correctly", () => {
      const url = "https://example.com?id=123&ref=twitter&utm_source=google";
      const expected = {
        id: "123",
        ref: "twitter",
        utm_source: "google",
      };

      expect(UrlProcessor.extractQueryParameters(url)).toEqual(expected);
    });

    it("should return empty object for URLs without parameters", () => {
      expect(UrlProcessor.extractQueryParameters("https://example.com")).toEqual({});
    });

    it("should return empty object for invalid URLs", () => {
      expect(UrlProcessor.extractQueryParameters("invalid-url")).toEqual({});
    });

    it("should handle encoded parameters", () => {
      const url = "https://example.com?message=hello%20world&special=%26%3D";
      const expected = {
        message: "hello world",
        special: "&=",
      };

      expect(UrlProcessor.extractQueryParameters(url)).toEqual(expected);
    });
  });

  describe("isShortenedUrl", () => {
    it("should return true for known shortened URL services", () => {
      expect(UrlProcessor.isShortenedUrl("https://bit.ly/abc123")).toBe(true);
      expect(UrlProcessor.isShortenedUrl("https://tinyurl.com/xyz789")).toBe(true);
      expect(UrlProcessor.isShortenedUrl("https://t.co/abcdef")).toBe(true);
      expect(UrlProcessor.isShortenedUrl("https://goo.gl/maps/xyz")).toBe(true);
    });

    it("should return false for regular URLs", () => {
      expect(UrlProcessor.isShortenedUrl("https://example.com/article")).toBe(false);
      expect(UrlProcessor.isShortenedUrl("https://news.ycombinator.com")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(UrlProcessor.isShortenedUrl("invalid-url")).toBe(false);
    });
  });

  describe("validateAndClean", () => {
    it("should return cleaned URL for valid input", () => {
      const url = "  https://example.com/article#section  ";
      const expected = "https://example.com/article";

      expect(UrlProcessor.validateAndClean(url)).toBe(expected);
    });

    it("should throw error for invalid URLs", () => {
      expect(() => UrlProcessor.validateAndClean("invalid-url")).toThrow("Invalid URL format");
    });

    it("should throw error for empty or null input", () => {
      expect(() => UrlProcessor.validateAndClean("")).toThrow("URL must be a non-empty string");

      expect(() => UrlProcessor.validateAndClean(null as unknown as string)).toThrow("URL must be a non-empty string");
    });

    it("should handle URLs with query parameters", () => {
      const url = "https://example.com/article?id=123&ref=twitter#section";
      const expected = "https://example.com/article?id=123&ref=twitter";

      expect(UrlProcessor.validateAndClean(url)).toBe(expected);
    });
  });
});
