import { describe, expect, it } from "vitest";
import { fakeDeps, NOW } from "../fake-deps";
import { fetchKimiUsage, parseKimiUsage } from "../../src/lib/providers/kimi";
import { ProviderError } from "../../src/lib/types";

const PRIMARY = "https://api.kimi.com/coding/v1/usages";
const FALLBACK = "https://api.kimi.ai/coding/v1/usages";

// Numbers come back as strings, the way Kimi sends them.
const USAGE_JSON = {
  usage: { limit: "2048", used: "120", remaining: "1928", resetTime: "2026-10-20T00:00:00Z" },
  limits: [
    {
      window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
      detail: { limit: "200", used: "37", remaining: "163", resetTime: "2026-10-14T17:00:00Z" },
    },
  ],
};

const settings = { kimiApiKey: "  kimi-test-key  " };

function errorOfSync(run: () => unknown): ProviderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error("expected a ProviderError");
}

describe("fetchKimiUsage", () => {
  it("reads the coding usage with a bearer token and builds the 5-hour and weekly windows", async () => {
    const deps = fakeDeps({ routes: [{ prefix: PRIMARY, respond: { body: USAGE_JSON } }] });
    const usage = await fetchKimiUsage(deps, settings);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0].url).toBe(PRIMARY);
    expect(deps.requests[0].headers.authorization).toBe("Bearer kimi-test-key");
    expect(usage).toEqual({
      provider: "kimi",
      windows: [
        {
          label: "5-Hour",
          usedPercent: (37 / 200) * 100,
          resetsAt: Date.parse("2026-10-14T17:00:00Z"),
          detail: "37 / 200 requests",
        },
        {
          label: "Weekly",
          usedPercent: (120 / 2048) * 100,
          resetsAt: Date.parse("2026-10-20T00:00:00Z"),
          detail: "120 / 2048 requests",
        },
      ],
      balances: [],
      notes: [],
      source: "API key",
      fetchedAt: NOW,
    });
  });

  it("throws not-connected for an empty or whitespace key without any request", async () => {
    for (const kimiApiKey of ["", "   ", undefined]) {
      const deps = fakeDeps({ routes: [{ prefix: PRIMARY, respond: { body: USAGE_JSON } }] });
      const error = await fetchKimiUsage(deps, { kimiApiKey }).catch((e: unknown) => e);
      expect((error as ProviderError).kind).toBe("not-connected");
      expect((error as ProviderError).message).toBe("No Kimi Code API key");
      expect((error as ProviderError).hint).toContain("https://www.kimi.com/code/console");
      expect(deps.requests).toHaveLength(0);
    }
  });

  it("names the preference in the auth hint when the key came from there, since Connect is hidden", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: PRIMARY, respond: { status: 401, body: {} } },
        { prefix: FALLBACK, respond: { status: 401, body: {} } },
      ],
    });
    const error = await fetchKimiUsage(deps, { ...settings, kimiApiKeySource: "preference" }).catch((e: unknown) => e);
    expect((error as ProviderError).hint).toBe("Check the Kimi Code API key in the extension preferences");
  });

  it("throws auth with the preferences hint when both hosts reject the key", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: PRIMARY, respond: { status: 401, body: {} } },
        { prefix: FALLBACK, respond: { status: 401, body: {} } },
      ],
    });
    const error = await fetchKimiUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("auth");
    expect((error as ProviderError).hint).toBe(
      "Choose Connect Kimi Code from this item's actions to enter a new key, or check the key in the extension preferences",
    );
    expect(deps.requests.map((request) => request.url)).toEqual([PRIMARY, FALLBACK]);
  });

  it("falls back to kimi.ai when kimi.com answers 404", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: PRIMARY, respond: { status: 404, body: {} } },
        { prefix: FALLBACK, respond: { body: USAGE_JSON } },
      ],
    });
    const usage = await fetchKimiUsage(deps, settings);
    expect(usage.windows).toHaveLength(2);
    expect(deps.requests.map((request) => request.url)).toEqual([PRIMARY, FALLBACK]);
  });

  it("falls back to kimi.ai when kimi.com refuses the key", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: PRIMARY, respond: { status: 403, body: {} } },
        { prefix: FALLBACK, respond: { body: USAGE_JSON } },
      ],
    });
    const usage = await fetchKimiUsage(deps, settings);
    expect(usage.windows).toHaveLength(2);
  });

  it("does not try kimi.ai on a server error", async () => {
    const deps = fakeDeps({ routes: [{ prefix: PRIMARY, respond: { status: 500, body: {} } }] });
    const error = await fetchKimiUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("http");
    expect(deps.requests.map((request) => request.url)).toEqual([PRIMARY]);
  });

  it("throws parse when the body isn't JSON", async () => {
    const deps = fakeDeps({ routes: [{ prefix: PRIMARY, respond: { body: "not json" } }] });
    const error = await fetchKimiUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("parse");
  });
});

describe("parseKimiUsage", () => {
  it("accepts numeric values as numbers as well as strings", () => {
    const usage = parseKimiUsage({ usage: { limit: 100, used: 25 } }, NOW);
    expect(usage.windows).toEqual([{ label: "Weekly", usedPercent: 25, resetsAt: null, detail: "25 / 100 requests" }]);
  });

  it("derives used from remaining when used is missing", () => {
    const usage = parseKimiUsage({ usage: { limit: "200", remaining: "150" } }, NOW);
    expect(usage.windows[0].usedPercent).toBe(25);
    expect(usage.windows[0].detail).toBe("50 / 200 requests");
  });

  it("labels 300 minutes as 5-Hour and other durations as hours or days", () => {
    const usage = parseKimiUsage(
      {
        limits: [
          { window: { duration: 1, timeUnit: "TIME_UNIT_DAY" }, detail: { limit: "10", used: "1" } },
          { window: { duration: 2, timeUnit: "TIME_UNIT_HOUR" }, detail: { limit: "10", used: "2" } },
          { window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" }, detail: { limit: "10", used: "3" } },
        ],
      },
      NOW,
    );
    // Sorted shortest first: 2-Hour, 5-Hour, then 1-Day.
    expect(usage.windows.map((window) => window.label)).toEqual(["2-Hour", "5-Hour", "1-Day"]);
  });

  it("reads the newer ratio pools and skips a usage weekly that duplicates them", () => {
    const usage = parseKimiUsage(
      {
        usages: {
          limit_5h: { used_ratio: 0.25, reset_time: "2026-10-14T17:00:00Z" },
          limit_7d: { used_ratio: 0.5, reset_time: "2026-10-20T00:00:00Z" },
          limit_month_total: { used_ratio: 1.4 },
        },
        usage: { limit: "100", used: "10" },
      },
      NOW,
    );
    expect(usage.windows).toEqual([
      { label: "5-Hour", usedPercent: 25, resetsAt: Date.parse("2026-10-14T17:00:00Z") },
      { label: "Weekly", usedPercent: 50, resetsAt: Date.parse("2026-10-20T00:00:00Z") },
      { label: "Monthly", usedPercent: 100, resetsAt: null },
    ]);
  });

  it("reads the plan name from the membership level", () => {
    const usage = parseKimiUsage(
      {
        usage: { limit: "10", used: "1" },
        user: { membership: { level: "LEVEL_INTERMEDIATE" } },
        version: "GOODS_VERSION_V1",
      },
      NOW,
    );
    expect(usage.plan).toBe("Allegretto");
  });

  it("shows the raw level for an unknown goods version", () => {
    const usage = parseKimiUsage(
      { usage: { limit: "10", used: "1" }, user: { membership: { level: "LEVEL_INTERMEDIATE" } }, version: "GOODS_V2" },
      NOW,
    );
    expect(usage.plan).toBe("LEVEL_INTERMEDIATE");
  });

  it("skips windows without a positive limit and reads reset aliases", () => {
    const usage = parseKimiUsage(
      {
        usage: { limit: "0", used: "0" },
        limits: [
          { window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" }, detail: { limit: "0", used: "0" } },
          {
            window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
            detail: { limit: "10", used: "5", reset_at: "2026-10-14T17:00:00Z" },
          },
        ],
      },
      NOW,
    );
    expect(usage.windows).toEqual([
      {
        label: "5-Hour",
        usedPercent: 50,
        resetsAt: Date.parse("2026-10-14T17:00:00Z"),
        detail: "5 / 10 requests",
      },
    ]);
  });

  it("throws parse when nothing usable came back", () => {
    expect(errorOfSync(() => parseKimiUsage({ usage: { used: "3" } }, NOW)).kind).toBe("parse");
    expect(errorOfSync(() => parseKimiUsage({}, NOW)).message).toBe("Kimi Code returned no usable quota windows");
  });

  it("throws parse when the body is not an object", () => {
    expect(errorOfSync(() => parseKimiUsage([1, 2], NOW)).kind).toBe("parse");
  });
});
