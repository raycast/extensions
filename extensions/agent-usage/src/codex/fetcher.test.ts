import assert from "node:assert/strict";
import test from "node:test";

import { fetchCodexDisplayName, parseCodexApiResponse, parseCodexDisplayName, parseCodexUserId } from "./fetcher.ts";

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

  const result = parseCodexApiResponse(proResponse, null, null, "Ada Lovelace");
  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage!.account, "Pro 20x");
  assert.equal(result.usage!.displayName, "Ada Lovelace");
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

test("parseCodexApiResponse maps named additional rate limits and all their windows", () => {
  const response = {
    plan_type: "pro",
    rate_limit: {
      primary_window: { used_percent: 21, limit_window_seconds: 604800, reset_after_seconds: 261224 },
      secondary_window: null,
    },
    additional_rate_limits: [
      {
        limit_name: "GPT-5.3-Codex-Spark",
        metered_feature: "codex_bengalfox",
        rate_limit: {
          primary_window: {
            used_percent: 0,
            limit_window_seconds: 604800,
            reset_after_seconds: 604800,
            reset_at: 1786790310,
          },
          secondary_window: {
            used_percent: 25,
            limit_window_seconds: 18000,
            reset_after_seconds: 9000,
          },
        },
      },
    ],
  };

  const result = parseCodexApiResponse(response);

  assert.equal(result.error, null);
  assert.deepEqual(result.usage!.additionalRateLimits, [
    {
      name: "GPT-5.3-Codex-Spark",
      meteredFeature: "codex_bengalfox",
      windows: [
        { percentageRemaining: 100, resetsInSeconds: 604800, limitWindowSeconds: 604800 },
        { percentageRemaining: 75, resetsInSeconds: 9000, limitWindowSeconds: 18000 },
      ],
    },
  ]);
});

test("parseCodexApiResponse ignores malformed additional rate limits without rejecting the main usage", () => {
  const result = parseCodexApiResponse({
    ...PLUS_RESPONSE,
    additional_rate_limits: [
      null,
      { limit_name: "", rate_limit: { primary_window: { used_percent: 0, limit_window_seconds: 604800 } } },
      { limit_name: "Missing Windows", rate_limit: { primary_window: null, secondary_window: null } },
      { limit_name: "Malformed Window", rate_limit: { primary_window: { used_percent: "zero" } } },
    ],
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.usage!.additionalRateLimits, []);
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

test("Codex profile parsers extract trimmed user and display names", () => {
  assert.equal(parseCodexUserId({ user_id: "  user-123  " }), "user-123");
  assert.equal(parseCodexDisplayName({ display_name: "  Ada Lovelace  " }), "Ada Lovelace");
  assert.equal(parseCodexUserId({ user_id: "" }), null);
  assert.equal(parseCodexDisplayName({ display_name: 123 }), null);
});

test("fetchCodexDisplayName follows settings user_id to the Calpico profile with account scope", async () => {
  const requests: Array<{ url: string; accountId?: string }> = [];
  const displayName = await fetchCodexDisplayName("token", "acct-work", async (options) => {
    requests.push({ url: options.url, accountId: options.headers?.["ChatGPT-Account-ID"] });
    if (options.url.endsWith("/wham/settings/user")) {
      return { data: { user_id: "user/123" }, error: null };
    }
    return { data: { display_name: "Ada Lovelace" }, error: null };
  });

  assert.equal(displayName, "Ada Lovelace");
  assert.deepEqual(requests, [
    { url: "https://chatgpt.com/backend-api/wham/settings/user", accountId: "acct-work" },
    {
      url: "https://chatgpt.com/backend-api/calpico/chatgpt/profile/user%2F123",
      accountId: "acct-work",
    },
  ]);
});
