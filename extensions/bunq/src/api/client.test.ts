import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BunqApiError, bunqRequest, get, post, put, del, getBaseUrl } from "./client";
import { getPreferenceValues } from "@raycast/api";

vi.mock("../lib/crypto", () => ({
  createRequestSignature: vi.fn(() => "mocked-signature"),
  verifyResponseSignature: vi.fn(() => true),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("client", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Default to sandbox environment
    vi.mocked(getPreferenceValues).mockReturnValue({
      apiKey: "test-api-key",
      environment: "sandbox",
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getBaseUrl", () => {
    it("returns sandbox URL for sandbox environment", async () => {
      const { getPreferenceValues } = await import("@raycast/api");
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
      });
      expect(getBaseUrl()).toBe("https://public-api.sandbox.bunq.com/v1");
    });

    it("returns production URL for production environment", async () => {
      const { getPreferenceValues } = await import("@raycast/api");
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "production",
      });
      expect(getBaseUrl()).toBe("https://api.bunq.com/v1");
    });
  });

  describe("BunqApiError", () => {
    it("creates error with correct properties", () => {
      const errors = [{ error_description: "Test error", error_description_translated: "Test error" }];
      const error = new BunqApiError("Test error", 400, errors);

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.errors).toBe(errors);
      expect(error.name).toBe("BunqApiError");
    });

    it("extends Error", () => {
      const error = new BunqApiError("Test", 500, []);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof BunqApiError).toBe(true);
    });
  });

  describe("bunqRequest", () => {
    it("makes successful request", async () => {
      const responseData = { Response: [{ id: 123 }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        headers: new Headers(),
      });

      const result = await bunqRequest("GET", "/test");

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://public-api.sandbox.bunq.com/v1/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("includes auth token in headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"Response": []}'),
        headers: new Headers(),
      });

      await bunqRequest("GET", "/test", undefined, { authToken: "test-token" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Bunq-Client-Authentication": "test-token",
          }),
        }),
      );
    });

    it("signs request when sign option is true", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"Response": []}'),
        headers: new Headers(),
      });

      await bunqRequest("POST", "/test", { data: "test" }, { sign: true, privateKey: "private-key" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Bunq-Client-Signature": "mocked-signature",
          }),
        }),
      );
    });

    it("throws BunqApiError on API error response", async () => {
      const errorResponse = {
        Error: [{ error_description: "Invalid request", error_description_translated: "Invalid request" }],
      };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
        headers: new Headers(),
      });

      await expect(bunqRequest("GET", "/test")).rejects.toThrow(BunqApiError);

      // Reset and test for error message
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
        headers: new Headers(),
      });
      await expect(bunqRequest("GET", "/test")).rejects.toThrow("Invalid request");
    });

    it("logs 404 errors as warnings", async () => {
      const { logger } = await import("../lib/logger");
      const errorResponse = {
        Error: [{ error_description: "Not found", error_description_translated: "Not found" }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify(errorResponse)),
        headers: new Headers(),
      });

      try {
        await bunqRequest("GET", "/test");
      } catch {
        // Expected to throw
      }

      expect(logger.warn).toHaveBeenCalledWith("API error", expect.objectContaining({ statusCode: 404 }));
    });

    it("throws on invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("not json"),
        headers: new Headers(),
      });

      await expect(bunqRequest("GET", "/test")).rejects.toThrow(BunqApiError);
    });

    it("verifies response signature when serverPublicKey provided", async () => {
      const { verifyResponseSignature } = await import("../lib/crypto");
      const responseData = { Response: [{ id: 123 }] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        headers: new Headers({ "X-Bunq-Server-Signature": "server-sig" }),
      });

      await bunqRequest("GET", "/test", undefined, { serverPublicKey: "server-pub-key" });

      expect(verifyResponseSignature).toHaveBeenCalledWith(
        "server-pub-key",
        JSON.stringify(responseData),
        "server-sig",
      );
    });

    it("throws when signature verification fails", async () => {
      const { verifyResponseSignature } = await import("../lib/crypto");
      vi.mocked(verifyResponseSignature).mockReturnValueOnce(false);

      const responseData = { Response: [{ id: 123 }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        headers: new Headers({ "X-Bunq-Server-Signature": "invalid-sig" }),
      });

      await expect(bunqRequest("GET", "/test", undefined, { serverPublicKey: "server-pub-key" })).rejects.toThrow(
        "Response signature verification failed",
      );
    });
  });

  describe("HTTP method helpers", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"Response": [{"id": 1}]}'),
        headers: new Headers(),
      });
    });

    it("get makes GET request", async () => {
      await get("/test");
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "GET" }));
    });

    it("post makes POST request with body", async () => {
      await post("/test", { data: "test" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: '{"data":"test"}',
        }),
      );
    });

    it("put makes PUT request with body", async () => {
      await put("/test", { data: "test" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PUT",
          body: '{"data":"test"}',
        }),
      );
    });

    it("del makes DELETE request", async () => {
      await del("/test");
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "DELETE" }));
    });
  });
});
