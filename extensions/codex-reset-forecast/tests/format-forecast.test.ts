import { describe, expect, it } from "vitest";
import validFixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";
import {
  forecastTooltip,
  formatCompactDurationSince,
  formatPercentage,
  menuBarTitle,
  scoreTransition,
} from "../src/domain/format-forecast";

const forecast = parseForecastResponse(validFixture);
const now = new Date("2026-08-11T03:28:16.000Z");

describe("forecast formatting", () => {
  it("clamps percentages to their display range", () => {
    expect(formatPercentage(-4)).toBe("0%");
    expect(formatPercentage(64.4)).toBe("64%");
    expect(formatPercentage(140)).toBe("100%");
  });

  it("formats compact time since reset", () => {
    expect(formatCompactDurationSince(forecast.forecast.latestResetAt, now)).toBe("3h");
  });

  it("supports both menu-bar display preferences", () => {
    expect(menuBarTitle(forecast, "likelihood", now)).toBe("64%");
    expect(menuBarTitle(forecast, "last-reset", now)).toBe("3h");
    expect(menuBarTitle(forecast, "last-reset", new Date(forecast.forecast.latestResetAt))).toBe("now");
  });

  it("explains the forecast in the menu-bar tooltip", () => {
    expect(forecastTooltip(forecast, now)).toBe(
      "64% forecast likelihood of a surprise Codex quota reset — last confirmed reset 3 hours ago",
    );
  });

  it("formats score transitions", () => {
    expect(scoreTransition(31, 3)).toBe("31% → 3%");
  });
});
