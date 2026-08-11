import { describe, expect, it } from "vitest";
import validFixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse, type ForecastResponse } from "../src/api/forecast-schema";
import { forecastNarrative } from "../src/domain/forecast-copy";

const baseForecast = parseForecastResponse(validFixture);

function responseWith(score: number, resetAnnounced = false): ForecastResponse {
  return {
    ...baseForecast,
    forecast: {
      ...baseForecast.forecast,
      score,
      resetAnnounced,
    },
  };
}

describe("forecast narrative", () => {
  it("mirrors the website copy during the post-reset cooldown", () => {
    const narrative = forecastNarrative(baseForecast, new Date("2026-08-11T18:28:16.000Z"));

    expect(narrative).toEqual({
      advice: "Tibo already pressed it. Spend responsibly, or do not.",
      summary:
        "The latest Codex quota reset was confirmed 18h ago. The cooldown now outweighs the incident weather.",
      title: "It already reset.",
    });
  });

  it("prioritizes an announced reset", () => {
    expect(forecastNarrative(responseWith(100, true), new Date("2026-08-13T00:28:16.000Z"))).toEqual({
      advice: "Treat the forecast as certain, but do not count the new quota until it lands.",
      summary:
        "Tibo announced a Codex rate-limit reset in the next 48 hours. It has not happened yet, so the reset clock and cooldown have not moved.",
      title: "Reset announced.",
    });
  });

  it.each([
    [72, "Use it or potentially lose it."],
    [48, "Worth a tactical token burn."],
    [26, "Do not force it."],
    [25, "Probably not today."],
  ])("uses the website score bands after the cooldown for %i%%", (score, title) => {
    expect(forecastNarrative(responseWith(score), new Date("2026-08-13T00:28:16.000Z")).title).toBe(title);
  });
});
