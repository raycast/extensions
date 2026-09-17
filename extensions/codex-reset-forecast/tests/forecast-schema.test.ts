import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import wire from "./fixtures/snapshot-wire.json";
import { parseForecastResponse, parseSnapshotPayload } from "../src/api/forecast-schema";

describe("Codex Reset Monitor contract", () => {
  it("decodes a captured homepage server response", () => {
    const result = parseSnapshotPayload(wire);
    expect(result.forecast?.score24h).toBe(24);
    expect(result.forecast?.score48h).toBe(43);
    expect(result.history).toHaveLength(26);
    expect(result.history[0].dateTime).toBe("2026-09-08T04:05:53.000Z");
    expect(result.ingestion?.accountsSucceeded).toBe(5);
  });

  it("keeps unavailable probabilities distinct from zero and allows history without a forecast", () => {
    expect(parseForecastResponse({ ...fixture, forecast: null }).history).toHaveLength(26);
    expect(
      parseForecastResponse({ ...fixture, forecast: { ...fixture.forecast, score24h: null, score48h: 0 } }).forecast,
    ).toMatchObject({ score24h: null, score48h: 0 });
  });

  it.each([-1, 101, Infinity, NaN, "24"])("rejects invalid probability %s", (score24h) => {
    expect(() => parseForecastResponse({ ...fixture, forecast: { ...fixture.forecast, score24h } })).toThrow();
  });

  it("rejects missing records and invalid dates instead of inventing empty history", () => {
    expect(() => parseForecastResponse({ ...fixture, history: undefined })).toThrow();
    expect(() =>
      parseForecastResponse({ ...fixture, history: [{ ...fixture.history[0], dateTime: "2026-02-30T00:00:00Z" }] }),
    ).toThrow();
  });

  it("retains and validates the source's scheduled reassessment", () => {
    const forecast = { ...fixture.forecast, nextReassessmentAt: "2026-09-10T07:00:00Z" };
    expect(parseForecastResponse({ ...fixture, forecast }).forecast?.nextReassessmentAt).toBe(
      forecast.nextReassessmentAt,
    );
    expect(() =>
      parseForecastResponse({ ...fixture, forecast: { ...forecast, nextReassessmentAt: "invalid" } }),
    ).toThrow();
  });

  it("discards unused fields including upstream account telemetry", () => {
    const parsed = parseForecastResponse({ ...fixture, quotaTelemetry: { remainingPercent: 69 }, futureField: true });
    expect(parsed).not.toHaveProperty("quotaTelemetry");
    expect(parsed).not.toHaveProperty("futureField");
  });

  it("rejects an incomplete forecast and invalid server envelopes", () => {
    expect(() =>
      parseForecastResponse({ fetchedAt: fixture.updatedAt, forecast: { score: 64 }, history: [] }),
    ).toThrow();
    expect(() => parseSnapshotPayload({ result: fixture })).toThrow();
  });
});
