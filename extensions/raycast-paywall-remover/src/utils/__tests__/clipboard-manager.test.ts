import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Raycast API before importing
vi.mock("@raycast/api", () => ({
  Clipboard: {
    readText: vi.fn(),
  },
}));

import { ClipboardManager } from "../clipboard-manager";
import { Clipboard } from "@raycast/api";

describe("ClipboardManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractUrl", () => {
    it("should extract valid HTTP URL from clipboard", async () => {
      const testUrl = "http://example.com/article";
      vi.mocked(Clipboard.readText).mockResolvedValue(testUrl);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe(testUrl);
    });

    it("should extract valid HTTPS URL from clipboard", async () => {
      const testUrl = "https://example.com/article";
      vi.mocked(Clipboard.readText).mockResolvedValue(testUrl);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe(testUrl);
    });

    it("should extract first URL when multiple URLs are present", async () => {
      const clipboardText = "Check out https://first.com and https://second.com";
      vi.mocked(Clipboard.readText).mockResolvedValue(clipboardText);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe("https://first.com");
    });

    it("should extract URL from text with surrounding content", async () => {
      const clipboardText = "Here is an interesting article: https://example.com/article that you should read";
      vi.mocked(Clipboard.readText).mockResolvedValue(clipboardText);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe("https://example.com/article");
    });

    it("should return null when clipboard is empty", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("");

      const result = await ClipboardManager.extractUrl();
      expect(result).toBeNull();
    });

    it("should return null when clipboard contains only whitespace", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("   \n\t  ");

      const result = await ClipboardManager.extractUrl();
      expect(result).toBeNull();
    });

    it("should return null when no valid URLs are found", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("This is just plain text without URLs");

      const result = await ClipboardManager.extractUrl();
      expect(result).toBeNull();
    });

    it("should return null when invalid URL format is found", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("ftp://invalid.com or mailto:test@example.com");

      const result = await ClipboardManager.extractUrl();
      expect(result).toBeNull();
    });

    it("should handle clipboard read errors gracefully", async () => {
      vi.mocked(Clipboard.readText).mockRejectedValue(new Error("Clipboard access denied"));

      const result = await ClipboardManager.extractUrl();
      expect(result).toBeNull();
    });

    it("should extract URL with query parameters", async () => {
      const testUrl = "https://example.com/article?id=123&ref=twitter";
      vi.mocked(Clipboard.readText).mockResolvedValue(testUrl);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe(testUrl);
    });

    it("should extract URL with fragments", async () => {
      const testUrl = "https://example.com/article#section1";
      vi.mocked(Clipboard.readText).mockResolvedValue(testUrl);

      const result = await ClipboardManager.extractUrl();
      expect(result).toBe(testUrl);
    });
  });

  describe("hasValidUrl", () => {
    it("should return true when clipboard contains valid URL", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("https://example.com");

      const result = await ClipboardManager.hasValidUrl();
      expect(result).toBe(true);
    });

    it("should return false when clipboard contains no valid URL", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("No URLs here");

      const result = await ClipboardManager.hasValidUrl();
      expect(result).toBe(false);
    });

    it("should return false when clipboard is empty", async () => {
      vi.mocked(Clipboard.readText).mockResolvedValue("");

      const result = await ClipboardManager.hasValidUrl();
      expect(result).toBe(false);
    });
  });
});
