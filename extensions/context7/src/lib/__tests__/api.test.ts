/**
 * Unit tests for API client functions
 */

import { describe, it, expect } from "vitest";
import { buildHeaders, handleAPIError } from "../api";
import { APIError } from "../types";

describe("buildHeaders", () => {
  it("should build headers without API key", () => {
    const headers = buildHeaders();

    expect(headers).toEqual({
      Accept: "application/json",
    });
  });

  it("should build headers with API key", () => {
    const apiKey = "ctx7sk_test123";
    const headers = buildHeaders(apiKey);

    expect(headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer ctx7sk_test123",
    });
  });

  it("should handle empty string API key", () => {
    const headers = buildHeaders("");

    // Empty string is falsy, so Authorization should not be added
    expect(headers).toEqual({
      Accept: "application/json",
    });
  });

  it("should handle undefined API key explicitly", () => {
    const headers = buildHeaders(undefined);

    expect(headers).toEqual({
      Accept: "application/json",
    });
  });
});

describe("handleAPIError", () => {
  describe("HTTP status codes", () => {
    it("should handle 401 Unauthorized", () => {
      const error = handleAPIError(null, 401);

      expect(error).toEqual({
        status: 401,
        message: "Invalid API Key. Please check your configuration.",
        showPreferencesLink: true,
      } as APIError);
    });

    it("should handle 404 Not Found", () => {
      const error = handleAPIError(null, 404);

      expect(error).toEqual({
        status: 404,
        message: "Library not found.",
        showPreferencesLink: false,
      } as APIError);
    });

    it("should handle 429 Rate Limit", () => {
      const error = handleAPIError(null, 429);

      expect(error).toEqual({
        status: 429,
        message: "Rate limit exceeded. Configure an API Key for higher limits.",
        showPreferencesLink: true,
      } as APIError);
    });

    it("should handle 500 Server Error", () => {
      const error = handleAPIError(null, 500);

      expect(error).toEqual({
        status: 500,
        message: "Server error. Please try again later.",
        showPreferencesLink: false,
      } as APIError);
    });

    it("should handle unknown status codes", () => {
      const error = handleAPIError(null, 418);

      expect(error).toEqual({
        status: 418,
        message: "Request failed with status 418",
        showPreferencesLink: false,
      } as APIError);
    });

    it("should handle various client error codes", () => {
      const error400 = handleAPIError(null, 400);
      expect(error400.status).toBe(400);
      expect(error400.message).toContain("400");

      const error403 = handleAPIError(null, 403);
      expect(error403.status).toBe(403);
      expect(error403.message).toContain("403");
    });

    it("should handle various server error codes", () => {
      const error502 = handleAPIError(null, 502);
      expect(error502.status).toBe(502);
      expect(error502.message).toContain("502");

      const error503 = handleAPIError(null, 503);
      expect(error503.status).toBe(503);
      expect(error503.message).toContain("503");
    });
  });

  describe("network errors", () => {
    it("should handle network error with status -1", () => {
      const error = handleAPIError(new Error("Network failed"), -1);

      expect(error).toEqual({
        status: -1,
        message: "Network error. Please check your connection.",
        showPreferencesLink: false,
      } as APIError);
    });

    it("should handle network error with any error object", () => {
      const networkError = new TypeError("Failed to fetch");
      const error = handleAPIError(networkError, -1);

      expect(error.status).toBe(-1);
      expect(error.message).toBe("Network error. Please check your connection.");
      expect(error.showPreferencesLink).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle status code 0", () => {
      const error = handleAPIError(null, 0);

      expect(error.status).toBe(0);
      expect(error.message).toContain("0");
      expect(error.showPreferencesLink).toBe(false);
    });

    it("should handle negative status codes other than -1", () => {
      const error = handleAPIError(null, -999);

      expect(error.status).toBe(-999);
      expect(error.message).toContain("-999");
    });

    it("should handle very large status codes", () => {
      const error = handleAPIError(null, 9999);

      expect(error.status).toBe(9999);
      expect(error.message).toContain("9999");
    });
  });

  describe("showPreferencesLink flag", () => {
    it("should set showPreferencesLink to true for authentication errors", () => {
      const error401 = handleAPIError(null, 401);
      expect(error401.showPreferencesLink).toBe(true);

      const error429 = handleAPIError(null, 429);
      expect(error429.showPreferencesLink).toBe(true);
    });

    it("should set showPreferencesLink to false for other errors", () => {
      const error404 = handleAPIError(null, 404);
      expect(error404.showPreferencesLink).toBe(false);

      const error500 = handleAPIError(null, 500);
      expect(error500.showPreferencesLink).toBe(false);

      const errorNetwork = handleAPIError(null, -1);
      expect(errorNetwork.showPreferencesLink).toBe(false);
    });
  });

  describe("error parameter handling", () => {
    it("should work with null error", () => {
      const error = handleAPIError(null, 404);
      expect(error.status).toBe(404);
    });

    it("should work with undefined error", () => {
      const error = handleAPIError(undefined, 500);
      expect(error.status).toBe(500);
    });

    it("should work with Error objects", () => {
      const jsError = new Error("Something went wrong");
      const error = handleAPIError(jsError, 500);
      expect(error.status).toBe(500);
    });

    it("should work with custom error objects", () => {
      const customError = { message: "Custom error", code: "ERR_CUSTOM" };
      const error = handleAPIError(customError, -1);
      expect(error.status).toBe(-1);
    });

    it("should work with string errors", () => {
      const error = handleAPIError("String error", 500);
      expect(error.status).toBe(500);
    });
  });
});

// Note: search(), getDocs(), and getLlmsTxt() functions are not tested here because:
// 1. They require mocking @raycast/api (getPreferenceValues, environment)
// 2. They require mocking global fetch
// 3. They are integration-level functions that are better tested in an E2E environment
// 4. The core logic (buildHeaders, handleAPIError) is already tested above
//
// To test these functions, you would need:
// - vi.mock("@raycast/api", () => ({ ... }))
// - global.fetch = vi.fn()
// - Mock implementation for each test case
//
// Example structure (not implemented):
// describe("search", () => {
//   beforeEach(() => {
//     vi.mock("@raycast/api");
//     global.fetch = vi.fn();
//   });
//
//   it("should call fetch with correct parameters", async () => {
//     // Mock setup
//     // Call search()
//     // Assert fetch was called correctly
//   });
// });
