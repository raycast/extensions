import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";
import {
  forecastTooltip,
  formatCompactDurationSince,
  formatPercentage,
  formatRelativeTime,
  menuBarTitle,
  sourceWarning,
} from "../src/domain/format-forecast";

const response = parseForecastResponse(fixture);
const now = new Date("2026-09-09T07:00:00Z");

describe("forecast presentation", () => {
  it.each([
    [-1, "now"],
    [-59_999, "now"],
    [-60_000, "1 minute ago"],
    [-3_599_999, "59 minutes ago"],
    [-3_600_000, "1 hour ago"],
    [-86_399_999, "23 hours ago"],
    [-86_400_000, "yesterday"],
    [59_999, "now"],
    [60_000, "in 1 minute"],
    [3_599_999, "in 59 minutes"],
    [3_600_000, "in 1 hour"],
  ])("formats relative times without rounding across a boundary (%s ms)", (offset, expected) => {
    expect(formatRelativeTime(new Date(now.getTime() + offset).toISOString(), now)).toBe(expected);
  });
  it("shows an explicit 24-hour horizon in likelihood mode", () => {
    expect(menuBarTitle(response, "likelihood-24h", now)).toBe("24% · 24h");
    expect(menuBarTitle(response, "likelihood-48h", now)).toBe("43% · 48h");
    expect(menuBarTitle(response, "last-reset", now)).toBe("1d");
  });
  it("includes both horizons and the last reset in the tooltip", () => {
    expect(forecastTooltip(response, now)).toContain("24% within 24h, 43% within 48h");
    expect(forecastTooltip(response, now)).toContain("Last reset: yesterday");
  });
  it("represents missing data without inventing zero or a reset time", () => {
    expect(formatPercentage(null)).toBe("—");
    expect(formatPercentage(0)).toBe("0%");
    expect(menuBarTitle({ ...response, history: [] }, "last-reset", now)).toBe("—");
    expect(menuBarTitle({ ...response, forecast: null }, "likelihood-24h", now)).toBe("—");
  });
  it.each([
    [0, "now"],
    [59, "59m"],
    [60, "1h"],
    [1439, "23h"],
    [1440, "1d"],
  ])("formats %s elapsed minutes", (minutes, expected) => {
    expect(formatCompactDurationSince(new Date(now.getTime() - Number(minutes) * 60_000).toISOString(), now)).toBe(
      expected,
    );
  });
  it("distinguishes overdue published data from a healthy forecast", () => {
    expect(sourceWarning(response, now)).toBeUndefined();
    expect(sourceWarning({ ...response, forecast: null }, now)).toMatch(/not published/);
    expect(sourceWarning({ ...response, publishedExpiresAt: "2026-09-09T06:00:00Z" }, now)).toMatch(/overdue/);
    expect(sourceWarning({ ...response, publishedExpiresAt: "2026-09-09T07:01:00Z" }, now)).toBeUndefined();
  });
});
