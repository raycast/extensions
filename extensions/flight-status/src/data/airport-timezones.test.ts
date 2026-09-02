import { describe, it, expect } from "vitest";
import { AIRPORT_TIMEZONES, timezoneForAirport } from "./airport-timezones";

describe("timezoneForAirport", () => {
  it("resolves known airports to IANA timezones", () => {
    expect(timezoneForAirport("EWR")).toBe("America/New_York");
    expect(timezoneForAirport("SFO")).toBe("America/Los_Angeles");
    expect(timezoneForAirport("LHR")).toBe("Europe/London");
    expect(timezoneForAirport("NRT")).toBe("Asia/Tokyo");
  });

  it("is case-insensitive", () => {
    expect(timezoneForAirport("ewr")).toBe("America/New_York");
  });

  it("returns null for unknown or empty codes", () => {
    expect(timezoneForAirport("ZZZ")).toBeNull();
    expect(timezoneForAirport("")).toBeNull();
    expect(timezoneForAirport(null)).toBeNull();
    expect(timezoneForAirport(undefined)).toBeNull();
  });

  it("has a substantial, well-formed table", () => {
    const entries = Object.entries(AIRPORT_TIMEZONES);
    expect(entries.length).toBeGreaterThan(1000);
    // Every value is a plausible IANA zone (Region/City)
    expect(
      entries.every(
        ([iata, tz]) => /^[A-Z]{3}$/.test(iata) && tz.includes("/"),
      ),
    ).toBe(true);
  });
});
