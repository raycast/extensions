import { describe, expect, it } from "vitest";
import {
  AttioApiError,
  AttioNetworkError,
  isAuthError,
  isNetworkError,
  isRateLimited,
  parseRetryAfter,
} from "./errors";

describe("parseRetryAfter", () => {
  const now = Date.parse("2026-08-31T12:00:00.000Z");
  it("parses an HTTP date (what Attio actually sends)", () => {
    expect(parseRetryAfter("Mon, 31 Aug 2026 12:00:02 GMT", now)).toBe(2000);
  });
  it("parses delta-seconds", () => {
    expect(parseRetryAfter("3", now)).toBe(3000);
  });
  it("clamps past dates to 0", () => {
    expect(parseRetryAfter("Mon, 31 Aug 2026 11:59:00 GMT", now)).toBe(0);
  });
  it("returns undefined for garbage or absent headers", () => {
    expect(parseRetryAfter("soon", now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });
});

describe("predicates", () => {
  const auth = new AttioApiError(403, "auth_error", "unauthorized", "nope");
  const forbiddenButNotAuth = new AttioApiError(403, "invalid_request_error", "billing", "nope");
  it("isAuthError needs 403 AND type auth_error (live shape, spec §14)", () => {
    expect(isAuthError(auth)).toBe(true);
    expect(isAuthError(forbiddenButNotAuth)).toBe(false);
    expect(isAuthError(new Error("x"))).toBe(false);
  });
  it("isRateLimited / isNetworkError", () => {
    expect(isRateLimited(new AttioApiError(429, "rate_limit_error", "rate_limit_exceeded", "x", 1000))).toBe(true);
    expect(isNetworkError(new AttioNetworkError("down"))).toBe(true);
    expect(isNetworkError(auth)).toBe(false);
  });
});
