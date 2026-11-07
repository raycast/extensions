import { describe, expect, it } from "vitest";
import { fakeDeps, NOW } from "../fake-deps";
import { fetchZaiUsage, parseZaiUsage } from "../../src/lib/providers/zai";
import { ProviderError } from "../../src/lib/types";

const GLOBAL_URL = "https://api.z.ai/api/monitor/usage/quota/limit";
const CHINA_URL = "https://open.bigmodel.cn/api/monitor/usage/quota/limit";

const FIVE_HOUR_RESET = NOW + 3 * 3600 * 1000;
const WEEK_RESET = NOW + 4 * 24 * 3600 * 1000;

// A realistic Coding Plan answer: a 5-hour token window, a weekly token window and the monthly MCP allowance.
const PLAN_JSON = {
  code: 200,
  msg: "Operation successful",
  success: true,
  data: {
    planName: "GLM Coding Max",
    limits: [
      {
        type: "TIME_LIMIT",
        unit: 5,
        number: 1,
        usage: 1000,
        currentValue: 120,
        remaining: 880,
        percentage: 12,
        nextResetTime: NOW + 20 * 24 * 3600 * 1000,
      },
      {
        type: "TOKENS_LIMIT",
        unit: 6,
        number: 1,
        usage: 1000,
        currentValue: 400,
        remaining: 600,
        percentage: 40,
        nextResetTime: WEEK_RESET,
      },
      {
        type: "TOKENS_LIMIT",
        unit: 3,
        number: 5,
        usage: 800,
        currentValue: 200,
        remaining: 600,
        percentage: 25,
        nextResetTime: FIVE_HOUR_RESET,
      },
    ],
  },
};

const settings = { zaiApiKey: "  zai-test-key  " };

function errorOf(promise: Promise<unknown>): Promise<ProviderError> {
  return promise.then(
    () => {
      throw new Error("expected a ProviderError");
    },
    (error: unknown) => {
      expect(error).toBeInstanceOf(ProviderError);
      return error as ProviderError;
    },
  );
}

describe("fetchZaiUsage", () => {
  it("reads the global quota with a bearer token and builds ordered windows", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { body: PLAN_JSON } }] });
    const usage = await fetchZaiUsage(deps, settings);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0].url).toBe(GLOBAL_URL);
    expect(deps.requests[0].headers.authorization).toBe("Bearer zai-test-key");
    expect(usage).toEqual({
      provider: "zai",
      plan: "GLM Coding Max",
      windows: [
        {
          label: "5-Hour",
          usedPercent: 25,
          resetsAt: FIVE_HOUR_RESET,
          detail: "200 / 800",
        },
        {
          label: "Weekly",
          usedPercent: 40,
          resetsAt: WEEK_RESET,
          detail: "400 / 1000",
        },
        {
          label: "MCP (Monthly)",
          usedPercent: 12,
          resetsAt: NOW + 20 * 24 * 3600 * 1000,
          detail: "120 / 1000",
        },
      ],
      balances: [],
      notes: [],
      source: "API key",
      fetchedAt: NOW,
    });
  });

  it("uses the China host when the region is china", async () => {
    const deps = fakeDeps({ routes: [{ prefix: CHINA_URL, respond: { body: PLAN_JSON } }] });
    await fetchZaiUsage(deps, { zaiApiKey: "k", zaiRegion: "china" });
    expect(deps.requests[0].url).toBe(CHINA_URL);
  });

  it("throws not-connected for an empty or whitespace key without any request", async () => {
    for (const zaiApiKey of ["", "  ", undefined]) {
      const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { body: PLAN_JSON } }] });
      const error = await errorOf(fetchZaiUsage(deps, { zaiApiKey }));
      expect(error.kind).toBe("not-connected");
      expect(error.message).toBe("No z.ai API key");
      expect(error.hint).toContain("Or add your z.ai API key in the extension preferences");
      expect(deps.requests).toHaveLength(0);
    }
  });

  it("names the preference in the auth hint when the key came from there, since Connect is hidden", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { status: 401, body: {} } }] });
    const error = await errorOf(fetchZaiUsage(deps, { ...settings, zaiApiKeySource: "preference" }));
    expect(error.hint).toBe("Check the z.ai API key in the extension preferences");
  });

  it("gives a key the envelope rejects the hint it is passed, so the source decides it there too", () => {
    const rejected = () =>
      parseZaiUsage({ code: 401, msg: "bad token", success: false }, NOW, "Check the z.ai API key");
    expect(errorOfSync(rejected).hint).toBe("Check the z.ai API key");
  });

  it("throws auth with the preferences hint on a 401", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { status: 401, body: {} } }] });
    const error = await errorOf(fetchZaiUsage(deps, settings));
    expect(error.kind).toBe("auth");
    expect(error.hint).toBe(
      "Choose Connect z.ai from this item's actions to enter a new key, or check the key in the extension preferences",
    );
    expect(error.message).not.toContain("zai-test-key");
  });

  it("reports a non-200 HTTP status as http", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { status: 503, body: {} } }] });
    const error = await errorOf(fetchZaiUsage(deps, settings));
    expect(error.kind).toBe("http");
  });
});

describe("parseZaiUsage", () => {
  it("throws auth when the envelope carries an auth code", () => {
    const error = errorOfSync(() => parseZaiUsage({ code: 401, msg: "bad token", success: false }, NOW));
    expect(error.kind).toBe("auth");
  });

  it("throws http with the message when the envelope reports another failure", () => {
    const error = errorOfSync(() => parseZaiUsage({ code: 500, msg: "server busy", success: false }, NOW));
    expect(error.kind).toBe("http");
    expect(error.message).toBe("z.ai quota API error: server busy");
  });

  it("treats success true with a non-200 code as a failure", () => {
    const error = errorOfSync(() => parseZaiUsage({ code: 201, msg: "", success: true, data: {} }, NOW));
    expect(error.kind).toBe("http");
  });

  it("throws parse when data or limits are missing", () => {
    expect(errorOfSync(() => parseZaiUsage({ code: 200, success: true, data: {} }, NOW)).kind).toBe("parse");
    expect(errorOfSync(() => parseZaiUsage({ code: 200, success: true }, NOW)).kind).toBe("parse");
  });

  it("throws parse with the Coding Plan hint when limits is empty", () => {
    const error = errorOfSync(() => parseZaiUsage({ code: 200, success: true, data: { limits: [] } }, NOW));
    expect(error.kind).toBe("parse");
    expect(error.message).toBe("z.ai returned no Coding Plan limits");
    expect(error.hint).toBe("Check that this key belongs to a GLM Coding Plan");
  });

  it("uses the percentage when no counts are given", () => {
    const usage = parseZaiUsage(
      { code: 200, success: true, data: { limits: [{ type: "TOKENS_LIMIT", unit: 3, number: 5, percentage: 130 }] } },
      NOW,
    );
    expect(usage.windows).toEqual([{ label: "5-Hour", usedPercent: 100, resetsAt: null }]);
  });

  it("derives used from remaining when currentValue is missing", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: { limits: [{ type: "CREDIT_LIMIT", unit: 6, number: 1, usage: 200, remaining: 50, percentage: 0 }] },
      },
      NOW,
    );
    expect(usage.windows).toEqual([{ label: "Weekly", usedPercent: 75, resetsAt: null, detail: "150 / 200" }]);
  });

  it("drops a 5-hour reset that is more than 5h1m away", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: {
          limits: [
            {
              type: "TOKENS_LIMIT",
              unit: 3,
              number: 5,
              usage: 100,
              currentValue: 10,
              percentage: 10,
              nextResetTime: NOW + 10 * 3600 * 1000,
            },
          ],
        },
      },
      NOW,
    );
    expect(usage.windows[0].resetsAt).toBeNull();
    expect(usage.windows[0].usedPercent).toBe(10);
  });

  it("keeps a 5-hour reset that is within the allowed slack", () => {
    const resetsAt = NOW + (5 * 3600 + 30) * 1000;
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: { limits: [{ type: "TOKENS_LIMIT", unit: 3, number: 5, percentage: 10, nextResetTime: resetsAt }] },
      },
      NOW,
    );
    expect(usage.windows[0].resetsAt).toBe(resetsAt);
  });

  it("labels other durations as <n> <unit> and sorts shortest first", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: {
          limits: [
            { type: "TOKENS_LIMIT", unit: 1, number: 3, percentage: 1 },
            { type: "TOKENS_LIMIT", unit: 3, number: 2, percentage: 2 },
            { type: "TOKENS_LIMIT", unit: 6, number: 1, percentage: 3 },
          ],
        },
      },
      NOW,
    );
    expect(usage.windows.map((window) => window.label)).toEqual(["2 Hours", "3 Days", "Weekly"]);
  });

  it("labels the monthly MCP marker and puts MCP after token windows", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: {
          limits: [
            { type: "TIME_LIMIT", unit: 5, number: 1, percentage: 5 },
            { type: "TOKENS_LIMIT", unit: 3, number: 5, percentage: 9 },
          ],
        },
      },
      NOW,
    );
    expect(usage.windows.map((window) => window.label)).toEqual(["5-Hour", "MCP (Monthly)"]);
  });

  it("skips unknown limit types and entries without numbers", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: {
          limits: [
            { type: "SOMETHING_NEW", unit: 3, number: 5, percentage: 99 },
            { type: "TOKENS_LIMIT", unit: 3, number: 5 },
            { type: "TOKENS_LIMIT", unit: 3, number: 5, percentage: "20" },
          ],
        },
      },
      NOW,
    );
    expect(usage.windows).toEqual([{ label: "5-Hour", usedPercent: 20, resetsAt: null }]);
  });

  it("throws parse when no entry is usable", () => {
    const error = errorOfSync(() =>
      parseZaiUsage({ code: 200, success: true, data: { limits: [{ type: "TOKENS_LIMIT" }] } }, NOW),
    );
    expect(error.kind).toBe("parse");
  });

  it("takes the plan name from the first field that is set", () => {
    const usage = parseZaiUsage(
      {
        code: 200,
        success: true,
        data: {
          plan_type: "Lite",
          packageName: "Pro",
          limits: [{ type: "TOKENS_LIMIT", unit: 3, number: 5, percentage: 1 }],
        },
      },
      NOW,
    );
    expect(usage.plan).toBe("Lite");
  });
});

function errorOfSync(run: () => unknown): ProviderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error("expected a ProviderError");
}
