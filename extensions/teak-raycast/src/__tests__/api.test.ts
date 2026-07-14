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
    expect(
      buildCardsSearchParams({
        favorited: true,
        limit: 50,
        query: "  design systems  ",
        sort: "oldest",
        tag: "research",
        type: "link",
      }),
    ).toBe(
      "q=design+systems&type=link&tag=research&favorited=true&sort=oldest&limit=50",
    );
  });

  test("buildCardsSearchParams omits empty query", () => {
    expect(buildCardsSearchParams({ query: "   ", limit: 50 })).toBe(
      "limit=50",
    );
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
    expect(toErrorCode("NOT_FOUND", "REQUEST_FAILED")).toBe("NOT_FOUND");
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

  test("maps API config errors to local setup guidance", () => {
    const error = new RaycastApiError("CONFIG_ERROR", 500);

    expect(getUserFacingErrorMessage(error)).toContain(
      "missing required configuration",
    );
    expect(getRecoveryHint(error)).toContain("CONVEX_HTTP_BASE_URL");
  });

  test("maps missing local api gateway errors to dev guidance", () => {
    const error = new RaycastApiError("DEV_API_UNAVAILABLE", 404);

    expect(getUserFacingErrorMessage(error)).toContain("API gateway");
    expect(getRecoveryHint(error)).toContain("bun run dev:api");
  });

  test("maps not found errors without implying a card was deleted", () => {
    const error = new RaycastApiError("NOT_FOUND", 404);

    expect(getUserFacingErrorMessage(error)).toContain("requested resource");
    expect(getUserFacingErrorMessage(error)).not.toContain(
      "card no longer exists",
    );
    expect(getRecoveryHint(error)).toContain("API URL");
  });

  test("handles unknown error values", () => {
    expect(getUserFacingErrorMessage(null)).toContain(
      "temporarily unavailable",
    );
  });
});
