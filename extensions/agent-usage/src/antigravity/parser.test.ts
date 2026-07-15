import test from "node:test";
import assert from "node:assert/strict";

test("parseAntigravityUserStatusResponse parses account and prioritized models", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const response = {
    code: 0,
    userStatus: {
      email: "user@example.com",
      planStatus: {
        planInfo: {
          planDisplayName: "Antigravity Pro",
        },
      },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: "Gemini Flash",
            modelOrAlias: { model: "gemini-flash" },
            quotaInfo: { remainingFraction: 0.2, resetTime: "2099-12-24T12:00:00Z" },
          },
          {
            label: "Claude 4 Opus",
            modelOrAlias: { model: "claude-4-opus" },
            quotaInfo: { remainingFraction: 0.5, resetTime: "2099-12-24T10:00:00Z" },
          },
          {
            label: "Gemini Pro High",
            modelOrAlias: { model: "gemini-pro-high" },
            quotaInfo: { remainingFraction: 0.8, resetTime: "2099-12-24T11:00:00Z" },
          },
        ],
      },
    },
  };

  const result = parseAntigravityUserStatusResponse(response);

  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage?.accountEmail, "user@example.com");
  assert.equal(result.usage?.accountPlan, "Antigravity Pro");
  assert.equal(result.usage?.primaryModel?.label, "Gemini Pro High");
  assert.equal(result.usage?.secondaryModel?.label, "Gemini Flash");
  assert.equal(result.usage?.tertiaryModel?.label, "Claude 4 Opus");
});

test("parseAntigravityCommandModelConfigsResponse supports fallback payload", async () => {
  const { parseAntigravityCommandModelConfigsResponse } = await import("./parser");

  const response = {
    code: "OK",
    clientModelConfigs: [
      {
        label: "Other Model",
        modelOrAlias: { model: "other-model" },
        quotaInfo: { remainingFraction: 0.3, resetTime: "2099-12-24T10:00:00Z" },
      },
      {
        label: "Another Model",
        modelOrAlias: { model: "another-model" },
        quotaInfo: { remainingFraction: 0.6, resetTime: "2099-12-24T11:00:00Z" },
      },
    ],
  };

  const result = parseAntigravityCommandModelConfigsResponse(response);

  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage?.accountEmail, null);
  assert.equal(result.usage?.accountPlan, null);
  assert.equal(result.usage?.primaryModel?.label, "Other Model");
  assert.equal(result.usage?.secondaryModel?.label, "Another Model");
});

test("formatResetTime supports ISO and epoch values", async () => {
  const { formatResetTime } = await import("../agents/format");

  const originalNow = Date.now;
  Date.now = () => new Date("2026-01-01T00:00:00Z").getTime();

  try {
    assert.equal(formatResetTime("2026-01-01T00:30:00Z"), "30m");
    assert.equal(formatResetTime(String(Math.floor(new Date("2026-01-01T02:00:00Z").getTime() / 1000))), "2h");
  } finally {
    Date.now = originalNow;
  }
});

test("parseAntigravityUserStatusResponse falls back to Claude Sonnet when Opus is unavailable", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const response = {
    code: 0,
    userStatus: {
      email: "user@example.com",
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: "Claude 3.7 Sonnet",
            modelOrAlias: { model: "claude-3-7-sonnet" },
            quotaInfo: { remainingFraction: 0.6, resetTime: "2099-12-24T10:00:00Z" },
          },
          {
            label: "Gemini Pro High",
            modelOrAlias: { model: "gemini-pro-high" },
            quotaInfo: { remainingFraction: 0.7, resetTime: "2099-12-24T11:00:00Z" },
          },
          {
            label: "Gemini Flash",
            modelOrAlias: { model: "gemini-flash" },
            quotaInfo: { remainingFraction: 0.5, resetTime: "2099-12-24T12:00:00Z" },
          },
        ],
      },
    },
  };

  const result = parseAntigravityUserStatusResponse(response);

  assert.equal(result.error, null);
  assert.equal(result.usage?.primaryModel?.label, "Gemini Pro High");
  assert.equal(result.usage?.secondaryModel?.label, "Gemini Flash");
  assert.equal(result.usage?.tertiaryModel?.label, "Claude 3.7 Sonnet");
});

test("parseAntigravityUserStatusResponse returns parse_error for invalid payload", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const result = parseAntigravityUserStatusResponse({ code: 0, userStatus: { cascadeModelConfigData: {} } });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});

test("selectDisplayModels selects any Claude/Gemini Pro models and fills remaining slots up to 3", async () => {
  const { selectDisplayModels } = await import("./parser");

  const models = [
    {
      label: "Claude 3.5 Haiku",
      modelId: "claude-haiku",
      percentLeft: 90,
      resetsIn: "1h",
      resetAt: null,
    },
    {
      label: "Gemini 1.5 Pro",
      modelId: "gemini-pro-1.5",
      percentLeft: 40,
      resetsIn: "1h",
      resetAt: null,
    },
    {
      label: "Claude 3.7 Sonnet (Thinking)",
      modelId: "claude-sonnet-thinking",
      percentLeft: 20,
      resetsIn: "1h",
      resetAt: null,
    },
  ];

  const ordered = selectDisplayModels(models);

  // Should have selected:
  // 1. Gemini Pro model (Gemini 1.5 Pro, via isGeminiPro fallback)
  // 2. Claude model (Claude 3.5 Haiku, via isClaudeAny fallback)
  // 3. Since no Gemini Flash exists, the 3rd slot is filled by the remaining Claude 3.7 Sonnet (Thinking)
  assert.equal(ordered.length, 3);
  assert.equal(ordered[0].modelId, "gemini-pro-1.5");
  assert.equal(ordered[1].modelId, "claude-haiku");
  assert.equal(ordered[2].modelId, "claude-sonnet-thinking");
});

test("parseAntigravityUserStatusResponse parses detailed quota groups when provided", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const response = {
    code: 0,
    userStatus: {
      email: "kevin@example.com",
      planStatus: { planInfo: { planName: "Pro" } },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: "Claude 3.7 Sonnet",
            modelOrAlias: { model: "claude-3-7-sonnet" },
            quotaInfo: { remainingFraction: 0.6, resetTime: "2099-12-24T10:00:00Z" },
          },
        ],
      },
    },
  };

  const quotaSummary = {
    response: {
      groups: [
        {
          displayName: "Gemini Models",
          description: "Gemini Flash, Gemini Pro",
          buckets: [
            {
              bucketId: "gemini-weekly",
              displayName: "Weekly Limit",
              window: "weekly",
              remainingFraction: 0.74,
              resetTime: "2099-12-24T12:00:00Z",
            },
          ],
        },
      ],
    },
  };

  const result = parseAntigravityUserStatusResponse(response, quotaSummary);

  assert.equal(result.error, null);
  assert.ok(result.usage?.quotaGroups);
  assert.equal(result.usage?.quotaGroups?.length, 1);
  assert.equal(result.usage?.quotaGroups?.[0].displayName, "Gemini Models");
  assert.equal(result.usage?.quotaGroups?.[0].buckets[0].percentLeft, 74);
});

test("parseAntigravityUserStatusResponse accepts quota groups without legacy model configs", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const response = {
    code: 0,
    userStatus: {
      email: "kevin@example.com",
      planStatus: { planInfo: { planName: "Pro" } },
      cascadeModelConfigData: {
        clientModelConfigs: [],
      },
    },
  };

  const quotaSummary = {
    response: {
      groups: [
        {
          displayName: "Gemini Models",
          buckets: [
            {
              bucketId: "gemini-daily",
              displayName: "Daily Limit",
              window: "daily",
              remainingFraction: 0.31,
              resetTime: "2099-12-24T12:00:00Z",
            },
          ],
        },
      ],
    },
  };

  const result = parseAntigravityUserStatusResponse(response, quotaSummary);

  assert.equal(result.error, null);
  assert.equal(result.usage?.models.length, 0);
  assert.equal(result.usage?.primaryModel, null);
  assert.equal(result.usage?.quotaGroups?.[0].buckets[0].percentLeft, 31);
});

test("parseAntigravityUserStatusResponse ignores quota groups without usable buckets", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const response = {
    code: 0,
    userStatus: {
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: "Gemini Pro High",
            modelOrAlias: { model: "gemini-pro-high" },
            quotaInfo: { remainingFraction: 0.8, resetTime: "2099-12-24T11:00:00Z" },
          },
        ],
      },
    },
  };

  const quotaSummary = {
    response: {
      groups: [
        {
          displayName: "Empty group",
          buckets: [{}],
        },
      ],
    },
  };

  const result = parseAntigravityUserStatusResponse(response, quotaSummary);

  assert.equal(result.error, null);
  assert.equal(result.usage?.primaryModel?.label, "Gemini Pro High");
  assert.equal(result.usage?.quotaGroups, undefined);
});
