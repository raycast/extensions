import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClipboardManager } from "../clipboard-manager";
import { BrowserIntegration } from "../browser-integration";
import { UrlProcessor } from "../url-processor";
import { Clipboard } from "@raycast/api";

// Mock Raycast API
vi.mock("@raycast/api");

describe("Comprehensive Edge Cases Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("URL Processing Edge Cases - Requirements 5.1, 5.2, 5.3, 5.4", () => {
    describe("Complex URL formats", () => {
      it("should handle URLs with complex query parameters", () => {
        // Arrange - Requirement 5.1
        const complexUrl =
          "https://example.com/article?utm_source=newsletter&utm_medium=email&ref=homepage&id=123&category=tech";

        // Act
        const isValid = UrlProcessor.isValidUrl(complexUrl);

        // Assert
        expect(isValid).toBe(true);
      });

      it("should handle URLs with special characters", () => {
        // Arrange - Requirement 5.1
        const specialUrl = "https://example.com/article?title=Hello%20World&author=John%20Doe";

        // Act
        const isValid = UrlProcessor.isValidUrl(specialUrl);

        // Assert
        expect(isValid).toBe(true);
      });

      it("should identify shortened URLs correctly", () => {
        // Arrange - Requirement 5.2
        const shortUrl = "https://bit.ly/3abc123";
        const regularUrl = "https://example.com/article";

        // Act
        const isShortened1 = UrlProcessor.isShortenedUrl(shortUrl);
        const isShortened2 = UrlProcessor.isShortenedUrl(regularUrl);

        // Assert
        expect(isShortened1).toBe(true);
        expect(isShortened2).toBe(false);
      });

      it("should handle URLs with fragments", () => {
        // Arrange - Requirement 5.1
        const urlWithFragment = "https://example.com/article#section-2";

        // Act
        const isValid = UrlProcessor.isValidUrl(urlWithFragment);
        const normalized = UrlProcessor.normalizeUrl(urlWithFragment);

        // Assert
        expect(isValid).toBe(true);
        expect(normalized).toBe("https://example.com/article"); // Fragment should be removed
      });

      it("should reject invalid URL formats", () => {
        // Arrange - Requirement 5.1
        const invalidUrls = ["not-a-url", "http://", "https://", "ftp://example.com", 'javascript:alert("test")'];

        // Act & Assert
        invalidUrls.forEach((url) => {
          expect(UrlProcessor.isValidUrl(url)).toBe(false);
        });
      });
    });

    describe("Multiple URLs handling", () => {
      it("should extract first valid URL from clipboard with multiple URLs", async () => {
        // Arrange - Requirement 5.3
        const multipleUrlsText = "Check out https://example.com/first and also https://example.com/second";
        vi.mocked(Clipboard.readText).mockResolvedValue(multipleUrlsText);

        // Act
        const extractedUrl = await ClipboardManager.extractUrl();

        // Assert - Should extract the first URL found by regex
        expect(extractedUrl).toBe("https://example.com/first");
      });

      it("should handle mixed valid and invalid URLs in clipboard", async () => {
        // Arrange - Requirement 5.3
        const mixedUrlsText = "Invalid: not-a-url Valid: https://example.com/article Invalid: http://";
        vi.mocked(Clipboard.readText).mockResolvedValue(mixedUrlsText);

        // Act
        const extractedUrl = await ClipboardManager.extractUrl();

        // Assert - Should extract the valid URL
        expect(extractedUrl).toBe("https://example.com/article");
      });
    });
  });

  describe("Service Configuration Edge Cases - Requirements 3.1, 3.2, 3.3, 3.5", () => {
    describe("URL formatting for service", () => {
      it("should format URLs correctly for paywall service", () => {
        // Arrange
        const targetUrl = "https://example.com/article";
        const serviceUrl = "https://12ft.io";

        // Act
        const formatted = UrlProcessor.formatForService(targetUrl, serviceUrl);

        // Assert
        expect(formatted).toContain("12ft.io");
        expect(formatted).toContain(targetUrl);
      });

      it("should handle service URLs with trailing slashes", () => {
        // Arrange
        const targetUrl = "https://example.com/article";
        const serviceUrlWithSlash = "https://12ft.io/";
        const serviceUrlWithoutSlash = "https://12ft.io";

        // Act
        const formatted1 = UrlProcessor.formatForService(targetUrl, serviceUrlWithSlash);
        const formatted2 = UrlProcessor.formatForService(targetUrl, serviceUrlWithoutSlash);

        // Assert
        expect(formatted1).toBe(formatted2);
      });

      it("should validate service URLs correctly", () => {
        // Arrange
        const validServiceUrls = ["https://12ft.io", "http://localhost:3000", "https://myservice.example.com"];
        const invalidServiceUrls = ["not-a-url", "ftp://example.com", ""];

        // Act & Assert
        validServiceUrls.forEach((url) => {
          expect(UrlProcessor.isValidServiceUrl(url)).toBe(true);
        });

        invalidServiceUrls.forEach((url) => {
          expect(UrlProcessor.isValidServiceUrl(url)).toBe(false);
        });
      });
    });
  });

  describe("Clipboard Integration Edge Cases - Requirements 1.4, 5.3", () => {
    it("should handle empty clipboard", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockResolvedValue("");

      // Act
      const extractedUrl = await ClipboardManager.extractUrl();

      // Assert
      expect(extractedUrl).toBeNull();
    });

    it("should handle clipboard with only whitespace", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockResolvedValue("   \n\t   ");

      // Act
      const extractedUrl = await ClipboardManager.extractUrl();

      // Assert
      expect(extractedUrl).toBeNull();
    });

    it("should handle clipboard with non-URL text", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockResolvedValue("This is just regular text without any URLs");

      // Act
      const extractedUrl = await ClipboardManager.extractUrl();

      // Assert
      expect(extractedUrl).toBeNull();
    });

    it("should handle clipboard access errors gracefully", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockRejectedValue(new Error("Permission denied"));

      // Act
      const extractedUrl = await ClipboardManager.extractUrl();

      // Assert
      expect(extractedUrl).toBeNull();
    });

    it("should detect valid URLs in clipboard correctly", async () => {
      // Arrange
      const validUrl = "https://example.com/article";
      vi.mocked(Clipboard.readText).mockResolvedValue(validUrl);

      // Act
      const hasValidUrl = await ClipboardManager.hasValidUrl();

      // Assert
      expect(hasValidUrl).toBe(true);
    });
  });

  describe("Browser Integration Edge Cases - Requirements 2.4, 4.4", () => {
    it("should handle no active browser gracefully", async () => {
      // Arrange - Mock exec to simulate no browser running
      const mockExec = vi.fn().mockRejectedValue(new Error("No browser found"));
      vi.doMock("child_process", () => ({
        exec: mockExec,
      }));

      // Act
      const tabUrl = await BrowserIntegration.getCurrentTabUrl();

      // Assert
      expect(tabUrl).toBeNull();
    });

    it("should handle browser with no active tabs", async () => {
      // Arrange - Mock exec to return empty result
      const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
      vi.doMock("child_process", () => ({
        exec: mockExec,
      }));

      // Act
      const tabUrl = await BrowserIntegration.getCurrentTabUrl();

      // Assert
      expect(tabUrl).toBeNull();
    });
  });

  describe("URL Processor Utility Functions Edge Cases", () => {
    it("should extract domain from valid URLs", () => {
      // Arrange
      const testCases = [
        { url: "https://example.com/article", expected: "example.com" },
        { url: "https://subdomain.example.com/path", expected: "subdomain.example.com" },
        { url: "https://example.com:8080/article", expected: "example.com" },
      ];

      // Act & Assert
      testCases.forEach(({ url, expected }) => {
        const domain = UrlProcessor.extractDomain(url);
        expect(domain).toBe(expected);
      });
    });

    it("should return null for invalid URLs when extracting domain", () => {
      // Arrange
      const invalidUrls = ["not-a-url", "", "ftp://example.com"];

      // Act & Assert
      invalidUrls.forEach((url) => {
        const domain = UrlProcessor.extractDomain(url);
        expect(domain).toBeNull();
      });
    });

    it("should detect query parameters correctly", () => {
      // Arrange
      const urlWithParams = "https://example.com/article?param1=value1&param2=value2";
      const urlWithoutParams = "https://example.com/article";

      // Act
      const hasParams1 = UrlProcessor.hasQueryParameters(urlWithParams);
      const hasParams2 = UrlProcessor.hasQueryParameters(urlWithoutParams);

      // Assert
      expect(hasParams1).toBe(true);
      expect(hasParams2).toBe(false);
    });

    it("should extract query parameters correctly", () => {
      // Arrange
      const url = "https://example.com/article?param1=value1&param2=value2";

      // Act
      const params = UrlProcessor.extractQueryParameters(url);

      // Assert
      expect(params).toEqual({
        param1: "value1",
        param2: "value2",
      });
    });

    it("should validate and clean URLs correctly", () => {
      // Arrange
      const validUrl = "  https://example.com/article#section  ";

      // Act
      const cleaned = UrlProcessor.validateAndClean(validUrl);

      // Assert
      expect(cleaned).toBe("https://example.com/article");
    });

    it("should throw error for invalid URLs in validateAndClean", () => {
      // Arrange
      const invalidUrls = ["not-a-url", "", "ftp://example.com"];

      // Act & Assert
      invalidUrls.forEach((url) => {
        expect(() => UrlProcessor.validateAndClean(url)).toThrow();
      });
    });
  });

  describe("Error Handling Edge Cases - Requirements 4.3, 4.4", () => {
    it("should handle null and undefined inputs gracefully", () => {
      // Arrange
      const invalidInputs = [null, undefined];

      // Act & Assert
      invalidInputs.forEach((input) => {
        expect(UrlProcessor.isValidUrl(input as unknown as string)).toBe(false);
        expect(UrlProcessor.extractDomain(input as unknown as string)).toBeNull();
        expect(UrlProcessor.hasQueryParameters(input as unknown as string)).toBe(false);
        expect(UrlProcessor.extractQueryParameters(input as unknown as string)).toEqual({});
        expect(UrlProcessor.isShortenedUrl(input as unknown as string)).toBe(false);
      });
    });

    it("should handle empty string inputs", () => {
      // Arrange
      const emptyString = "";

      // Act & Assert
      expect(UrlProcessor.isValidUrl(emptyString)).toBe(false);
      expect(UrlProcessor.extractDomain(emptyString)).toBeNull();
      expect(UrlProcessor.hasQueryParameters(emptyString)).toBe(false);
      expect(UrlProcessor.extractQueryParameters(emptyString)).toEqual({});
      expect(UrlProcessor.isShortenedUrl(emptyString)).toBe(false);
    });

    it("should handle whitespace-only inputs", () => {
      // Arrange
      const whitespaceString = "   \n\t   ";

      // Act & Assert
      expect(UrlProcessor.isValidUrl(whitespaceString)).toBe(false);
      expect(UrlProcessor.extractDomain(whitespaceString)).toBeNull();
      expect(UrlProcessor.hasQueryParameters(whitespaceString)).toBe(false);
      expect(UrlProcessor.extractQueryParameters(whitespaceString)).toEqual({});
      expect(UrlProcessor.isShortenedUrl(whitespaceString)).toBe(false);
    });

    it("should handle very long URLs", () => {
      // Arrange
      const longUrl = "https://example.com/" + "a".repeat(1000) + "?param=" + "b".repeat(500);

      // Act
      const isValid = UrlProcessor.isValidUrl(longUrl);

      // Assert
      expect(isValid).toBe(true);
    });

    it("should handle service formatting errors gracefully", () => {
      // Arrange
      const invalidTargetUrls = ["not-a-url", "", "ftp://example.com"];
      const invalidServiceUrls = ["not-a-url", "", "ftp://example.com"];
      const validUrl = "https://example.com/article";
      const validServiceUrl = "https://12ft.io";

      // Act & Assert - Invalid target URLs
      invalidTargetUrls.forEach((url) => {
        expect(() => UrlProcessor.formatForService(url, validServiceUrl)).toThrow();
      });

      // Act & Assert - Invalid service URLs
      invalidServiceUrls.forEach((serviceUrl) => {
        expect(() => UrlProcessor.formatForService(validUrl, serviceUrl)).toThrow();
      });
    });
  });

  describe("Network and Service Failure Scenarios - Requirements 4.4, 5.4", () => {
    it("should handle clipboard read failures", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockRejectedValue(new Error("Clipboard access denied"));

      // Act
      const result = await ClipboardManager.extractUrl();

      // Assert
      expect(result).toBeNull();
    });

    it("should handle clipboard with binary data", async () => {
      // Arrange
      vi.mocked(Clipboard.readText).mockResolvedValue("\x00\x01\x02\x03");

      // Act
      const result = await ClipboardManager.extractUrl();

      // Assert
      expect(result).toBeNull();
    });

    it("should handle malformed clipboard content", async () => {
      // Arrange
      const malformedContent = "https://. invalid https://example..com more invalid";
      vi.mocked(Clipboard.readText).mockResolvedValue(malformedContent);

      // Act
      const result = await ClipboardManager.extractUrl();

      // Assert
      expect(result).toBeNull(); // Should not extract malformed URLs
    });
  });
});
