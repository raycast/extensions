import { describe, expect, it } from "vitest";
import { fetchForecast } from "../src/api/forecast-client";
import { latestReset } from "../src/domain/reset-history";

describe.runIf(process.env.LIVE_CONTRACT === "1")("live codexreset.org contract", () => {
  it("provides both forecast horizons and sourced reset records", async () => {
    const data = await fetchForecast({ store: { read: () => undefined, write: () => undefined } });
    expect(data.response.forecast?.score24h).toBeTypeOf("number");
    expect(data.response.forecast?.score48h).toBeTypeOf("number");
    expect(data.response.history.length).toBeGreaterThan(0);
    expect(latestReset(data.response)?.sourceUrl).toMatch(/^https:\/\//);
  }, 20_000);
});
