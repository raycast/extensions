import { describe, expect, it } from "vitest";
import { IMAGE_URL_VALIDATION, isSecureImageUrl, isValidImageUrl, validateImageUrl } from "@/utils/validation";

describe("url-validation", () => {
  describe("Basic URL Validation", () => {
    it("accepts valid HTTP and HTTPS URLs", () => {
      expect(isValidImageUrl("http://example.com/image.png")).toBe(true);
      expect(isValidImageUrl("https://example.com/image.jpg")).toBe(true);
      expect(isValidImageUrl("https://cdn.example.com/assets/logo.svg")).toBe(true);
    });

    it("accepts URLs with query parameters and ports", () => {
      expect(isValidImageUrl("https://example.com/image.png?size=large")).toBe(true);
      expect(isValidImageUrl("http://localhost:3000/image.jpg")).toBe(true);
    });

    it("rejects dangerous URL schemes", () => {
      expect(isValidImageUrl("javascript:alert('xss')")).toBe(false);
      expect(isValidImageUrl("file:///etc/passwd")).toBe(false);
      expect(isValidImageUrl("data:image/png;base64,abc123")).toBe(false);
    });

    it("rejects malformed URLs", () => {
      expect(isValidImageUrl("not-a-url")).toBe(false);
      expect(isValidImageUrl("http://")).toBe(false);
      expect(isValidImageUrl("")).toBe(false);
    });
  });

  describe("URL Validation with Error Messages", () => {
    it("validates empty URLs as optional", () => {
      const result = validateImageUrl("");
      expect(result).toEqual({ isValid: true });
    });

    it("validates proper URLs successfully", () => {
      const result = validateImageUrl("https://example.com/image.png");
      expect(result).toEqual({ isValid: true });
    });

    it("rejects URLs that are too long", () => {
      const tooLongUrl = "https://example.com/" + "a".repeat(IMAGE_URL_VALIDATION.MAX_URL_LENGTH);
      const result = validateImageUrl(tooLongUrl);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(`URL too long (max ${IMAGE_URL_VALIDATION.MAX_URL_LENGTH} characters)`);
    });

    it("rejects invalid protocols with user-friendly messages", () => {
      const result = validateImageUrl("javascript:alert('xss')");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Please enter a valid HTTP or HTTPS URL");
    });
  });

  describe("Secure URL Type Guard", () => {
    it("acts as type guard for valid URLs", () => {
      expect(isSecureImageUrl("https://example.com/image.png")).toBe(true);
      expect(isSecureImageUrl("http://example.com/image.jpg")).toBe(true);
    });

    it("returns false for invalid or empty URLs", () => {
      expect(isSecureImageUrl(undefined)).toBe(false);
      expect(isSecureImageUrl("")).toBe(false);
      expect(isSecureImageUrl("javascript:alert('xss')")).toBe(false);
    });

    it("integrates with basic validation", () => {
      const validUrls = ["https://example.com/image.png", "http://example.com/image.jpg"];

      const invalidUrls = ["javascript:alert('xss')", "file:///etc/passwd", "not-a-url"];

      validUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(true);
        expect(isSecureImageUrl(url)).toBe(true);
      });

      invalidUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(false);
        expect(isSecureImageUrl(url)).toBe(false);
      });
    });
  });

  describe("Security Considerations", () => {
    it("prevents dangerous URLs and injection attacks", () => {
      const dangerousUrls = [
        "javascript:alert('xss')",
        "JAVASCRIPT:alert(document.cookie)",
        "file:///etc/passwd",
        "file://localhost/sensitive/file.txt",
        "data:text/html,<script>alert('xss')</script>",
        "data:image/svg+xml,<svg><script>alert(1)</script></svg>",
      ];

      dangerousUrls.forEach((url) => {
        expect(isValidImageUrl(url)).toBe(false);
        expect(validateImageUrl(url).isValid).toBe(false);
        expect(isSecureImageUrl(url)).toBe(false);
      });
    });
  });

  describe("Validation Constants", () => {
    it("exports expected validation constants", () => {
      expect(IMAGE_URL_VALIDATION.ALLOWED_PROTOCOLS).toEqual(["http:", "https:"]);
      expect(IMAGE_URL_VALIDATION.SUPPORTED_FORMATS).toEqual(["png", "jpg", "jpeg", "gif", "svg", "webp"]);
      expect(IMAGE_URL_VALIDATION.MAX_URL_LENGTH).toBe(2048);
    });
  });
});
