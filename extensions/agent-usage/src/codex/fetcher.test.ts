import test from "node:test";
import assert from "node:assert/strict";
import { parseCodexApiResponse } from "./fetcher";

const PLUS_RESPONSE = {
  plan_type: "plus",
  rate_limit: {
    primary_window: {
      used_percent: 2,
      limit_window_seconds: 604800,
      reset_after_seconds: 601818,
      reset_at: 1784488693,
    },
    secondary_window: null,
  },
  credits: {
    has_credits: false,
    unlimited: false,
    balance: "0",
  },
};

test("parseCodexApiResponse handles Plus plan (only weekly window, secondary_window=null)", () => {
  const result = parseCodexApiResponse(PLUS_RESPONSE);

  assert.equal(result.error, null);
  assert.ok(result.usage, "usage should be present");
  assert.equal(result.usage!.account, "Plus");
  assert.equal(result.usage!.fiveHourLimit, undefined, "Plus has no 5h limit");
  assert.ok(result.usage!.weeklyLimit, "weekly limit should be present");
  assert.equal(result.usage!.weeklyLimit!.percentageRemaining, 98);
  assert.equal(result.usage!.weeklyLimit!.limitWindowSeconds, 604800);
  assert.equal(result.usage!.codeReviewLimit, undefined);
  assert.equal(result.usage!.credits.balance, "0");
});

test("parseCodexApiResponse handles Pro/Team plan (both windows)", () => {
  const proResponse = {
    plan_type: "pro",
    rate_limit: {
      primary_window: {
        used_percent: 30,
        limit_window_seconds: 18000,
        reset_after_seconds: 5000,
      },
      secondary_window: {
        used_percent: 60,
        limit_window_seconds: 604800,
        reset_after_seconds: 100000,
      },
    },
    credits: { has_credits: true, unlimited: false, balance: "100" },
  };

  const result = parseCodexApiResponse(proResponse);
  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage!.account, "Pro 20x");
  assert.ok(result.usage!.fiveHourLimit, "5h should be present");
  assert.ok(result.usage!.weeklyLimit, "weekly should be present");
  assert.equal(result.usage!.fiveHourLimit!.percentageRemaining, 70);
  assert.equal(result.usage!.fiveHourLimit!.limitWindowSeconds, 18000);
  assert.equal(result.usage!.weeklyLimit!.percentageRemaining, 40);
  assert.equal(result.usage!.weeklyLimit!.limitWindowSeconds, 604800);
});

test("parseCodexApiResponse handles reversed windows (smaller secondary)", () => {
  const reversed = {
    plan_type: "team",
    rate_limit: {
      primary_window: {
        used_percent: 60,
        limit_window_seconds: 604800,
        reset_after_seconds: 100000,
      },
      secondary_window: {
        used_percent: 30,
        limit_window_seconds: 18000,
        reset_after_seconds: 5000,
      },
    },
  };

  const result = parseCodexApiResponse(reversed);
  assert.equal(result.error, null);
  assert.equal(result.usage!.fiveHourLimit!.limitWindowSeconds, 18000);
  assert.equal(result.usage!.weeklyLimit!.limitWindowSeconds, 604800);
});

test("parseCodexApiResponse picks code review limit when present", () => {
  const response = {
    plan_type: "pro",
    rate_limit: {
      primary_window: { used_percent: 10, limit_window_seconds: 18000, reset_after_seconds: 5000 },
      secondary_window: { used_percent: 20, limit_window_seconds: 604800, reset_after_seconds: 100000 },
    },
    code_review_rate_limit: {
      primary_window: { used_percent: 5, limit_window_seconds: 604800, reset_after_seconds: 200000 },
    },
  };

  const result = parseCodexApiResponse(response);
  assert.ok(result.usage!.codeReviewLimit);
  assert.equal(result.usage!.codeReviewLimit!.percentageRemaining, 95);
});

test("parseCodexApiResponse routes a single short window to fiveHourLimit only", () => {
  const onlyFiveHour = {
    plan_type: "free",
    rate_limit: {
      primary_window: { used_percent: 40, limit_window_seconds: 18000, reset_after_seconds: 5000 },
      secondary_window: null,
    },
  };

  const result = parseCodexApiResponse(onlyFiveHour);
  assert.equal(result.error, null);
  assert.ok(result.usage!.fiveHourLimit, "single short window must classify as 5h");
  assert.equal(result.usage!.weeklyLimit, undefined, "single short window must not be labeled weekly");
  assert.equal(result.usage!.fiveHourLimit!.limitWindowSeconds, 18000);
});

test("parseCodexApiResponse routes a single weekly window to weeklyLimit only", () => {
  const onlyWeekly = {
    plan_type: "plus",
    rate_limit: {
      primary_window: { used_percent: 5, limit_window_seconds: 604800, reset_after_seconds: 100000 },
      secondary_window: null,
    },
  };

  const result = parseCodexApiResponse(onlyWeekly);
  assert.equal(result.error, null);
  assert.equal(result.usage!.fiveHourLimit, undefined);
  assert.ok(result.usage!.weeklyLimit);
  assert.equal(result.usage!.weeklyLimit!.limitWindowSeconds, 604800);
});

test("parseCodexApiResponse returns parse_error when both windows are missing", () => {
  const result = parseCodexApiResponse({ plan_type: "free", rate_limit: {} });
  assert.equal(result.usage, null);
  assert.ok(result.error);
  assert.equal(result.error!.type, "parse_error");
});

test("parseCodexApiResponse returns parse_error on non-object data", () => {
  const result = parseCodexApiResponse(null);
  assert.equal(result.usage, null);
  assert.equal(result.error!.type, "parse_error");
});
