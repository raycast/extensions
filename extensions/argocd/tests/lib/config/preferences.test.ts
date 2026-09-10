import { describe, expect, it } from "vitest";
import { PREFERENCE_BOUNDS, clampPreferences } from "../../../src/lib/config/preferences";

describe("clampPreferences", () => {
  it("passes valid values through", () => {
    expect(
      clampPreferences({
        cacheTtlSeconds: "120",
        requestTimeoutSeconds: "20",
        probeTimeoutSeconds: "5",
        maxResults: "80",
      }),
    ).toEqual({ cacheTtlSeconds: 120, requestTimeoutSeconds: 20, probeTimeoutSeconds: 5, maxResults: 80 });
  });

  it("falls back to the default for a missing key", () => {
    expect(clampPreferences({})).toEqual({
      cacheTtlSeconds: PREFERENCE_BOUNDS.cacheTtlSeconds.fallback,
      requestTimeoutSeconds: PREFERENCE_BOUNDS.requestTimeoutSeconds.fallback,
      probeTimeoutSeconds: PREFERENCE_BOUNDS.probeTimeoutSeconds.fallback,
      maxResults: PREFERENCE_BOUNDS.maxResults.fallback,
    });
  });

  it("falls back to the default for a value that does not parse", () => {
    for (const raw of ["abc", "", "   ", "NaN"]) {
      expect(clampPreferences({ cacheTtlSeconds: raw }).cacheTtlSeconds).toBe(
        PREFERENCE_BOUNDS.cacheTtlSeconds.fallback,
      );
    }
  });

  it("clamps to the minimum, so a zero can never disable the cache or the timeout", () => {
    const clamped = clampPreferences({
      cacheTtlSeconds: "0",
      requestTimeoutSeconds: "0",
      probeTimeoutSeconds: "0",
      maxResults: "0",
    });
    expect(clamped).toEqual({
      cacheTtlSeconds: PREFERENCE_BOUNDS.cacheTtlSeconds.min,
      requestTimeoutSeconds: PREFERENCE_BOUNDS.requestTimeoutSeconds.min,
      probeTimeoutSeconds: PREFERENCE_BOUNDS.probeTimeoutSeconds.min,
      maxResults: PREFERENCE_BOUNDS.maxResults.min,
    });
  });

  it("clamps to the maximum, so a huge maxResults cannot freeze the list", () => {
    expect(clampPreferences({ maxResults: "99999" }).maxResults).toBe(PREFERENCE_BOUNDS.maxResults.max);
    expect(clampPreferences({ cacheTtlSeconds: "99999" }).cacheTtlSeconds).toBe(PREFERENCE_BOUNDS.cacheTtlSeconds.max);
  });

  it("rounds a fractional value and tolerates surrounding whitespace", () => {
    expect(clampPreferences({ maxResults: " 42.6 " }).maxResults).toBe(43);
  });

  it("clamps a negative value to the minimum", () => {
    expect(clampPreferences({ requestTimeoutSeconds: "-30" }).requestTimeoutSeconds).toBe(
      PREFERENCE_BOUNDS.requestTimeoutSeconds.min,
    );
  });
});
