import { describe, expect, it } from "vitest";
import invalidFixture from "./fixtures/forecast-invalid.json";
import validFixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse } from "../src/api/forecast-schema";

describe("parseForecastResponse", () => {
  it("parses the required forecast subset", () => {
    const result = parseForecastResponse(validFixture);

    expect(result.forecast.score).toBe(64);
    expect(result.history).toHaveLength(2);
  });

  it("does not require unused upstream forecast fields", () => {
    const result = parseForecastResponse({
      fetchedAt: validFixture.fetchedAt,
      forecast: {
        score: validFixture.forecast.score,
        latestResetAt: validFixture.forecast.latestResetAt,
      },
      history: validFixture.history,
    });

    expect(result.forecast.score).toBe(64);
  });

  it("rejects invalid scores and timestamps", () => {
    expect(() => parseForecastResponse(invalidFixture)).toThrow();
  });

  it("preserves unknown fields for forward-compatible source responses", () => {
    const result = parseForecastResponse({
      ...validFixture,
      futureRootField: "kept",
      forecast: {
        ...validFixture.forecast,
        futureForecastField: 42,
      },
    });

    expect(result).toMatchObject({
      futureRootField: "kept",
      forecast: { futureForecastField: 42 },
    });
  });

  it("rejects non-finite numbers without the deprecated finite check", () => {
    expect(() =>
      parseForecastResponse({
        ...validFixture,
        forecast: { ...validFixture.forecast, score: Number.POSITIVE_INFINITY },
      }),
    ).toThrow();
  });
});
