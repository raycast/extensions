import { describe, expect, test } from "bun:test";
import {
  buildCardsSearchParams,
  getRecoveryHint,
  getUserFacingErrorMessage,
  normalizeLimit,
  RaycastApiError,
  toErrorCode,
} from "../lib/apiErrors";

describe("raycast api helpers", () => {
  test("buildCardsSearchParams trims and encodes query params", () => {
    expect(buildCardsSearchParams("  design systems  ", 50)).toBe(
      "q=design+systems&limit=50",
    );
  });

  test("buildCardsSearchParams omits empty query", () => {
    expect(buildCardsSearchParams("   ", 50)).toBe("limit=50");
  });

  test("normalizeLimit clamps limits to backend contract", () => {
    expect(normalizeLimit(0)).toBe(1);
    expect(normalizeLimit(101)).toBe(100);
    expect(normalizeLimit(Number.NaN)).toBe(50);
  });

  test("toErrorCode falls back for unknown values", () => {
    expect(toErrorCode("INVALID_API_KEY", "REQUEST_FAILED")).toBe(
      "INVALID_API_KEY",
    );
    expect(toErrorCode("SOMETHING_ELSE", "REQUEST_FAILED")).toBe(
      "REQUEST_FAILED",
    );
  });

  test("maps invalid key errors to a user-facing message", () => {
    const error = new RaycastApiError("INVALID_API_KEY", 401);
    expect(getUserFacingErrorMessage(error)).toContain("invalid or revoked");
    expect(getRecoveryHint(error)).toContain("Open extension preferences");
  });

  test("maps rate limit errors to retry guidance", () => {
    const error = new RaycastApiError("RATE_LIMITED", 429);
    expect(getUserFacingErrorMessage(error)).toContain("Too many requests");
    expect(getRecoveryHint(error)).toContain("Wait a few seconds");
  });

  test("maps network errors to connectivity guidance", () => {
    const error = new RaycastApiError("NETWORK_ERROR");
    expect(getUserFacingErrorMessage(error)).toContain("Unable to reach Teak");
    expect(getRecoveryHint(error)).toContain("Check network connectivity");
  });

  test("handles unknown error values", () => {
    expect(getUserFacingErrorMessage(null)).toContain(
      "temporarily unavailable",
    );
  });
});
