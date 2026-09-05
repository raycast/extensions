import { describe, expect, it } from "vitest";
import { FORECAST_URL } from "../src/api/forecast-client";
import { parseForecastResponse } from "../src/api/forecast-schema";

describe.runIf(process.env.LIVE_CONTRACT === "1")("live forecast contract", () => {
  it("still provides the required public response subset", async () => {
    const response = await fetch(FORECAST_URL, { headers: { Accept: "application/json" } });

    expect(response.ok).toBe(true);
    const forecast = parseForecastResponse(await response.json());
    expect(forecast.forecast.score).toBeTypeOf("number");
    expect(forecast.forecast.latestResetAt).toBeTruthy();
    expect(Array.isArray(forecast.history)).toBe(true);
  });
});
