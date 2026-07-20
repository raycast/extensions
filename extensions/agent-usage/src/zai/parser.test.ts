import test from "node:test";
import assert from "node:assert/strict";

import { parseZaiApiResponse } from "./parser";

function limit(overrides: Record<string, unknown> = {}) {
  return {
    type: "TOKENS_LIMIT",
    unit: 1,
    number: 1,
    usage: 10,
    currentValue: 10,
    remaining: 90,
    percentage: 10,
    usageDetails: [],
    nextResetTime: null,
    ...overrides,
  };
}

function response(limits: unknown[], dataOverrides: Record<string, unknown> = {}) {
  return { code: 200, msg: "ok", success: true, data: { limits, ...dataOverrides } };
}

test("parseZaiApiResponse splits daily and weekly token/time limits by window", async () => {
  const { usage, error } = parseZaiApiResponse(
    response([
      limit({ type: "TOKENS_LIMIT", number: 1, unit: 1, percentage: 10 }),
      limit({ type: "TOKENS_LIMIT", number: 7, unit: 1, percentage: 25 }),
      limit({ type: "TIME_LIMIT", number: 1, unit: 1, percentage: 30 }),
      limit({ type: "TIME_LIMIT", number: 7, unit: 1, percentage: 40 }),
    ]),
  );

  assert.equal(error, null);
  assert.equal(usage?.tokenLimit?.windowDescription, "1 days");
  assert.equal(usage?.tokenLimit?.percentage, 10);
  assert.equal(usage?.weeklyTokenLimit?.windowDescription, "7 days");
  assert.equal(usage?.weeklyTokenLimit?.percentage, 25);
  assert.equal(usage?.timeLimit?.windowDescription, "1 days");
  assert.equal(usage?.timeLimit?.percentage, 30);
  assert.equal(usage?.weeklyTimeLimit?.windowDescription, "7 days");
  assert.equal(usage?.weeklyTimeLimit?.percentage, 40);
});

test("parseZaiApiResponse classifies by window regardless of array order", async () => {
  const { usage } = parseZaiApiResponse(
    response([
      limit({ type: "TOKENS_LIMIT", number: 7, unit: 1, percentage: 25 }),
      limit({ type: "TOKENS_LIMIT", number: 1, unit: 1, percentage: 10 }),
    ]),
  );

  assert.equal(usage?.tokenLimit?.percentage, 10);
  assert.equal(usage?.weeklyTokenLimit?.percentage, 25);
});

test("parseZaiApiResponse leaves weekly limits null when only a daily window is present", async () => {
  const { usage } = parseZaiApiResponse(
    response([limit({ type: "TOKENS_LIMIT", number: 1, unit: 1 }), limit({ type: "TIME_LIMIT", number: 1, unit: 1 })]),
  );

  assert.ok(usage?.tokenLimit);
  assert.equal(usage?.weeklyTokenLimit, null);
  assert.ok(usage?.timeLimit);
  assert.equal(usage?.weeklyTimeLimit, null);
});

test("parseZaiApiResponse does not alias a lone weekly window as both daily and weekly", async () => {
  // Only a 7-day window is present, no daily entry. The daily slot falls back to
  // it, but it must not also be surfaced as the weekly limit (duplicate data).
  const { usage } = parseZaiApiResponse(
    response([limit({ type: "TOKENS_LIMIT", number: 7, unit: 1, percentage: 25 })]),
  );

  assert.equal(usage?.tokenLimit?.percentage, 25);
  assert.equal(usage?.weeklyTokenLimit, null);
});

test("parseZaiApiResponse falls back to the first entry and a distinct second when no exact daily window matches", async () => {
  // Neither entry matches number===1 && unit===1, so daily falls back to the
  // first entry and weekly to the first entry that is not the daily one.
  const { usage } = parseZaiApiResponse(
    response([
      limit({ type: "TOKENS_LIMIT", number: 3, unit: 3, percentage: 11 }),
      limit({ type: "TOKENS_LIMIT", number: 30, unit: 1, percentage: 22 }),
    ]),
  );

  assert.equal(usage?.tokenLimit?.percentage, 11);
  assert.equal(usage?.weeklyTokenLimit?.percentage, 22);
});

test("parseZaiApiResponse maps usage details and reset time", async () => {
  const resetMs = Date.UTC(2026, 0, 1, 0, 0, 0);
  const { usage } = parseZaiApiResponse(
    response([
      limit({
        type: "TOKENS_LIMIT",
        number: 1,
        unit: 1,
        nextResetTime: resetMs,
        usageDetails: [{ modelCode: "glm-4.6", usage: 42 }],
      }),
    ]),
  );

  assert.equal(usage?.tokenLimit?.resetTime, new Date(resetMs).toISOString());
  assert.deepEqual(usage?.tokenLimit?.usageDetails, [{ modelCode: "glm-4.6", usage: 42 }]);
});

test("parseZaiApiResponse reads plan name from any of the supported fields", async () => {
  const fromPlan = parseZaiApiResponse(response([limit()], { plan: "Pro" }));
  assert.equal(fromPlan.usage?.planName, "Pro");

  const fromPackage = parseZaiApiResponse(response([limit()], { packageName: "Lite" }));
  assert.equal(fromPackage.usage?.planName, "Lite");

  const none = parseZaiApiResponse(response([limit()]));
  assert.equal(none.usage?.planName, null);
});

test("parseZaiApiResponse returns api_error when the response is unsuccessful", async () => {
  const { usage, error } = parseZaiApiResponse({ code: 401, msg: "unauthorized", success: false });
  assert.equal(usage, null);
  assert.equal(error?.type, "api_error");
  assert.equal(error?.message, "unauthorized");
});

test("parseZaiApiResponse returns parse_error for malformed or missing data", async () => {
  assert.equal(parseZaiApiResponse(null).error?.type, "parse_error");
  assert.equal(parseZaiApiResponse("not an object").error?.type, "parse_error");
  assert.equal(parseZaiApiResponse(response(undefined as unknown as unknown[])).error?.type, "parse_error");
});
