import { describe, expect, it } from "vitest";
import { compactWebhookUrl, isValidWebhookUrl, sanitizeDomainForFilename } from "./webhook-url";

describe("isValidWebhookUrl", () => {
  it("accepts an https URL", () => {
    expect(isValidWebhookUrl("https://example.com/webhook")).toBe(true);
  });
  it("rejects http", () => {
    expect(isValidWebhookUrl("http://example.com/webhook")).toBe(false);
  });
  it("rejects garbage", () => {
    expect(isValidWebhookUrl("not a url")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isValidWebhookUrl("")).toBe(false);
  });
});

describe("compactWebhookUrl", () => {
  describe("compact mode (wide=false)", () => {
    it("strips protocol and compacts long paths", () => {
      const result = compactWebhookUrl("https://zapier.com/webhooks/catch/123456/abc", false);
      expect(result).toBe("zapier.com/…/abc");
    });

    it("handles deeply nested paths", () => {
      const result = compactWebhookUrl("https://n8n.example.com/api/webhooks/v1/integration/deploy/webhook123", false);
      expect(result).toBe("n8n.example.com/…/webhook123");
    });

    it("returns just host for URLs with no path", () => {
      const result = compactWebhookUrl("https://example.com", false);
      expect(result).toBe("example.com");
    });

    it("handles root-level paths (single segment)", () => {
      const result = compactWebhookUrl("https://example.com/webhook", false);
      expect(result).toBe("example.com/webhook");
    });

    it("strips trailing slashes", () => {
      const result = compactWebhookUrl("https://example.com/webhook/", false);
      expect(result).toBe("example.com/webhook");
    });
  });

  describe("wide mode (wide=true)", () => {
    it("passes through short URLs unchanged", () => {
      const url = "https://example.com/hook";
      const result = compactWebhookUrl(url, true);
      expect(result).toBe("example.com/hook");
    });

    it("shows first and last segments for long paths", () => {
      const result = compactWebhookUrl(
        "https://zapier.com/webhooks/catch/123456/very/long/path/endpoint/integration/abc",
        true,
      );
      expect(result).toBe("zapier.com/webhooks/…/abc");
    });

    it("handles deeply nested paths with multiple middle segments", () => {
      const result = compactWebhookUrl(
        "https://example.com/api/webhooks/v1/integration/deploy/service/endpoint/webhook123",
        true,
      );
      expect(result).toBe("example.com/api/…/webhook123");
    });

    it("returns just host for URLs with no path", () => {
      const result = compactWebhookUrl("https://example.com", true);
      expect(result).toBe("example.com");
    });

    it("handles single segment paths like compact mode", () => {
      const result = compactWebhookUrl("https://example.com/webhook", true);
      expect(result).toBe("example.com/webhook");
    });

    it("strips trailing slashes", () => {
      const result = compactWebhookUrl(
        "https://example.com/webhooks/catch/123456/long/nested/path/integration/abc/",
        true,
      );
      expect(result).toBe("example.com/webhooks/…/abc");
    });
  });

  describe("invalid input", () => {
    it("returns input unchanged for garbage", () => {
      expect(compactWebhookUrl("not a url", false)).toBe("not a url");
      expect(compactWebhookUrl("not a url", true)).toBe("not a url");
    });

    it("returns input unchanged for empty string", () => {
      expect(compactWebhookUrl("", false)).toBe("");
      expect(compactWebhookUrl("", true)).toBe("");
    });
  });

  describe("60-char threshold (wide mode only)", () => {
    it("passes through host+path if ≤60 chars", () => {
      const short = "https://example.com/hook";
      const result = compactWebhookUrl(short, true);
      expect(result).toBe("example.com/hook");
      // Verify length is <= 60
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it("compacts if host+path > 60 chars", () => {
      const long = "https://very-long-domain-name.example.com/webhooks/catch/integration/webhook/event";
      const result = compactWebhookUrl(long, true);
      expect(result).toContain("…");
    });
  });
});

describe("sanitizeDomainForFilename", () => {
  it("extracts hostname and replaces non-alphanumeric with underscores", () => {
    const result = sanitizeDomainForFilename("https://api.Example.com/x");
    expect(result).toBe("api_example_com");
  });

  it("returns 'webhook' for invalid URLs", () => {
    const result = sanitizeDomainForFilename("garbage");
    expect(result).toBe("webhook");
  });
});
