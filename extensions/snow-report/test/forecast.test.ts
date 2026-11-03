import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { fetchForecasts, isPowder, precipitationNow, skyNow, windNow, type PointForecast } from "../src/lib/forecast";
import type { Resort } from "../src/types";

// Fifteen days of hourly data in UTC, starting a week before "now" (past_days=7 plus 8 forecast days).
const START = Date.UTC(2026, 0, 1);
const NOW = Date.UTC(2026, 0, 8, 12, 30);
const NOW_INDEX = 7 * 24 + 12; // the 12:00 slot
const HOURS = 15 * 24;
const time = Array.from({ length: HOURS }, (_, i) => new Date(START + i * 3600_000).toISOString().slice(0, 16));
const filled = (value: number | null) => Array<number | null>(HOURS).fill(value);

/** 0.5 cm of snow every hour, 3 cm in the hour after "now", 1.2 m of modeled depth. */
function location(elevation: number) {
  const snowfall = filled(0.5);
  snowfall[NOW_INDEX + 1] = 3;
  return {
    elevation,
    utc_offset_seconds: 0,
    hourly: {
      time,
      snowfall,
      rain: filled(0),
      snow_depth: filled(1.2),
      temperature_2m: time.map((_, i) => -10 + (i % 24)),
      freezing_level_height: filled(1800),
      wind_speed_10m: filled(20),
      wind_gusts_10m: filled(40),
      weather_code: filled(73),
      visibility: filled(5000),
      is_day: filled(1),
    },
  };
}

const requests: URL[] = [];

beforeEach(() => {
  requests.length = 0;
  mock.timers.enable({ apis: ["Date"], now: NOW });
  mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    const elevations = url.searchParams.get("elevation")!.split(",");
    const body = elevations.map((e) => location(e === "nan" ? 1500 : Number(e)));
    // Open-Meteo returns one location as an object and several as an array.
    return Response.json(body.length === 1 ? body[0] : body);
  });
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

const resort = (id: string, elevations?: [number, number]): Resort => ({
  id,
  name: id,
  country: "Canada",
  region: "",
  lat: 50,
  lon: -122,
  ...(elevations ? { baseElevation: elevations[0], topElevation: elevations[1] } : {}),
});

describe("fetchForecasts", () => {
  test("asks for a week of history", async () => {
    await fetchForecasts([resort("hill")]);
    assert.equal(requests[0].searchParams.get("past_days"), "7");
    assert.equal(requests[0].searchParams.get("forecast_days"), "8");
  });

  test("queries base and summit, and sums the hourly snowfall around now", async () => {
    const { whistler } = await fetchForecasts([resort("whistler", [650, 2250])]);
    assert.equal(whistler.kind, "split");
    if (whistler.kind !== "split") return;
    assert.equal(whistler.base.elevation, 650);
    assert.equal(whistler.summit.elevation, 2250);

    const p = whistler.summit;
    assert.equal(p.last24h, 12); // 24 hours of 0.5 cm, up to and including now
    assert.equal(p.last7d, 84); // 168 hours of 0.5 cm
    assert.equal(p.next24h, 14.5); // 23 × 0.5 + the 3 cm hour
    assert.equal(p.next72h, 71 * 0.5 + 3);
    assert.equal(p.snowNow, 3); // the value after now covers the hour in progress
    assert.equal(p.snowDepth, 120); // metres to cm
    assert.equal(p.temperature, 2); // -10 + 12
    assert.equal(p.isDay, true);
  });

  test("builds 7 days from today with totals and temperature ranges", async () => {
    const { whistler } = await fetchForecasts([resort("whistler", [650, 2250])]);
    if (whistler.kind !== "split") return assert.fail("expected a split forecast");
    const { days, next7d } = whistler.base;
    assert.deepEqual(
      days.map((d) => d.date),
      ["2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11", "2026-01-12", "2026-01-13", "2026-01-14"],
    );
    assert.equal(days[0].snowfall, 14.5);
    assert.equal(days[1].snowfall, 12);
    assert.deepEqual([days[1].tempMin, days[1].tempMax], [-10, 13]);
    assert.equal(days.length, 7);
    assert.equal(next7d, 167 * 0.5 + 3); // the 168 hours after now
  });

  test("next 7 days doesn't count snow that already fell today", async () => {
    mock.method(globalThis, "fetch", async () => {
      const loc = location(2000);
      loc.hourly.snowfall[NOW_INDEX - 2] = 20; // a morning storm, before now
      return Response.json(loc);
    });
    const { hill } = await fetchForecasts([resort("hill")]);
    if (hill.kind !== "single") return assert.fail("expected a single forecast");
    assert.equal(hill.point.next7d, 167 * 0.5 + 3);
    assert.equal(hill.point.days[0].snowfall, 14.5 - 0.5 + 20); // the outlook's "Today" still includes it
  });

  test("resorts without elevations get one point at the model's terrain height", async () => {
    const { hill } = await fetchForecasts([resort("hill")]);
    assert.equal(hill.kind, "single");
    assert.equal(requests[0].searchParams.get("elevation"), "nan");
  });

  test("large batches split into several requests and map back to the right resorts", async () => {
    const resorts = Array.from({ length: 60 }, (_, i) => resort(`r${i}`, [1000 + i, 2000 + i]));
    const result = await fetchForecasts(resorts);
    assert.ok(requests.length > 1, "expected the batch to be chunked");
    assert.ok(requests.every((url) => url.href.length <= 2000));
    for (const [i, r] of resorts.entries()) {
      const f = result[r.id];
      if (f.kind !== "split") return assert.fail(`${r.id} should be split`);
      assert.equal(f.base.elevation, 1000 + i);
      assert.equal(f.summit.elevation, 2000 + i);
    }
  });

  test("a missing hour makes the totals that include it unknown, not zero", async () => {
    mock.method(globalThis, "fetch", async () => {
      const loc = location(2000);
      loc.hourly.snowfall[NOW_INDEX - 6] = null;
      return Response.json(loc);
    });
    const { hill } = await fetchForecasts([resort("hill")]);
    if (hill.kind !== "single") return assert.fail("expected a single forecast");
    assert.equal(hill.point.last24h, null);
    assert.equal(hill.point.last7d, null);
    assert.equal(hill.point.next24h, 14.5);
  });
});

const point = (overrides: Partial<PointForecast>): PointForecast => ({
  elevation: 2000,
  last24h: 0,
  last7d: 0,
  next24h: 0,
  next72h: 0,
  next7d: 0,
  snowDepth: 0,
  temperature: 0,
  freezingLevel: 0,
  windSpeed: 0,
  windGusts: 0,
  snowNow: 0,
  rainNow: 0,
  weatherCode: 0,
  visibility: 10000,
  isDay: true,
  days: [],
  ...overrides,
});

describe("conditions now", () => {
  test("precipitation from the hour's amounts or the weather code", () => {
    assert.equal(precipitationNow(point({ snowNow: 0.4 })), "snow");
    assert.equal(precipitationNow(point({ weatherCode: 61 })), "rain");
    assert.equal(precipitationNow(point({ snowNow: 0.2, rainNow: 0.5 })), "mixed");
    assert.equal(precipitationNow(point({ snowNow: 0.05 })), "dry");
    assert.equal(precipitationNow(point({ snowNow: null, rainNow: null, weatherCode: null })), null);
  });

  test("sky: fog from the code or low visibility", () => {
    assert.equal(skyNow(point({ weatherCode: 0 })), "clear");
    assert.equal(skyNow(point({ weatherCode: 2 })), "partly-cloudy");
    assert.equal(skyNow(point({ weatherCode: 45 })), "fog");
    assert.equal(skyNow(point({ weatherCode: 3, visibility: 400 })), "fog");
    assert.equal(skyNow(point({ weatherCode: 73 })), "overcast");
  });

  test("wind thresholds", () => {
    assert.equal(windNow(point({ windSpeed: 10, windGusts: 20 })), "calm");
    assert.equal(windNow(point({ windSpeed: 30, windGusts: 35 })), "windy");
    assert.equal(windNow(point({ windSpeed: 20, windGusts: 60 })), "high");
    assert.equal(windNow(point({ windSpeed: null, windGusts: null })), null);
  });

  test("fresh powder from 10 cm in 24 hours", () => {
    assert.equal(isPowder(point({ last24h: 9.9 })), false);
    assert.equal(isPowder(point({ last24h: 10 })), true);
  });
});
