import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import forecast from "./fixtures/forecast-api.json";
import timeline from "./fixtures/timeline-api.json";
import { parseForecastResponse, parseSourceResponses } from "../src/api/forecast-schema";
import { latestReset, recordLabel, resetHistory } from "../src/domain/reset-history";

const now = new Date("2026-10-18T03:00:00Z");
describe("codex-reset.com public contract", () => {
  it("decodes captured forecast and timeline responses", () => {
    const result = parseSourceResponses(forecast, timeline);
    expect(result.forecast).toMatchObject({ score24h: 21, score48h: 37, confidence: "low", hasOfficialSignal: false });
    expect(result.history).toHaveLength(78);
    expect(latestReset(result, now)?.dateTime).toBe(forecast.last_reset_at);
    expect(result.forecast?.latestAlert?.confirmation_source).toBe("operator_observed");
  });
  it("uses the website's Reset, Note, and Banked categories and source summaries", () => {
    const result = parseSourceResponses(forecast, timeline);
    expect(recordLabel(result.history[0])).toBe("Reset");
    expect(recordLabel(result.history[1])).toBe("Note");
    expect(result.history[1].title).toBe("Note");
    expect(result.history[1].description).toBe(timeline.events[1].summary);
    expect(recordLabel(resetHistory(result, "banked")[0])).toBe("Banked");
  });
  it("never counts banked grants, previews, or unverified posts as resets", () => {
    const event = timeline.events[0];
    const events = [
      { ...event, id: "banked", group: "credits", confirmed: true, banked_state: "available" },
      { ...event, id: "preview", preview: true },
      { ...event, id: "unverified", announcement_state: "none", confirmed: true },
      { ...event, id: "future-group", group: "unknown" },
      { ...event, id: "verified", announcement_state: "announced", confirmed: false },
      { ...event, id: "archive", announcement_state: undefined, confirmed: true },
    ];
    const result = parseSourceResponses(forecast, { ...timeline, events });
    expect(resetHistory(result, "resets").map((record) => record.id)).toEqual(["archive", "verified"]);
    expect(resetHistory(result, "banked")[0].bankedState).toBe("available");
    expect(resetHistory(result, "announcements").map((record) => record.id)).toEqual(["preview", "unverified"]);
    expect(result.history.find((record) => record.id === "future-group")?.type).toBe("other");
  });
  it("uses the canonical reset clock when timeline publication lags", () => {
    const result = parseSourceResponses(forecast, { ...timeline, events: [] });
    expect(latestReset(result, now)?.dateTime).toBe(forecast.last_reset_at);
    expect(resetHistory(result, "resets")).toEqual([]);
  });
  it.each([-1, 101, Infinity, NaN, "24"])("rejects invalid probability %s", (rounded_24h) => {
    expect(() =>
      parseSourceResponses({ ...forecast, probabilities: { ...forecast.probabilities, rounded_24h } }, timeline),
    ).toThrow();
  });
  it("rejects missing history, confirmation flags, and invalid dates", () => {
    expect(() => parseSourceResponses(forecast, { updated_at: timeline.updated_at })).toThrow();
    expect(() =>
      parseSourceResponses(forecast, { ...timeline, events: [{ ...timeline.events[0], confirmed: undefined }] }),
    ).toThrow();
    expect(() => parseSourceResponses({ ...forecast, last_reset_at: "2026-02-30T00:00:00Z" }, timeline)).toThrow();
  });
  it("keeps unavailable data distinct from zero and strips undocumented fields", () => {
    expect(parseForecastResponse({ ...fixture, forecast: null }).history).toHaveLength(26);
    const result = parseForecastResponse({
      ...fixture,
      forecast: { ...fixture.forecast, score24h: null, score48h: 0 },
      quotaTelemetry: { remaining: 50 },
    });
    expect(result.forecast).toMatchObject({ score24h: null, score48h: 0 });
    expect(result).not.toHaveProperty("quotaTelemetry");
    expect(parseSourceResponses(forecast, timeline)).not.toHaveProperty("model");
  });
});
