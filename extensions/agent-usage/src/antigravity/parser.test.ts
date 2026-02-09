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
  assert.equal(result.usage?.primaryModel?.label, "Claude 4 Opus");
  assert.equal(result.usage?.secondaryModel?.label, "Gemini Pro High");
  assert.equal(result.usage?.tertiaryModel?.label, "Gemini Flash");
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
  const { formatResetTime } = await import("./parser");

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
  assert.equal(result.usage?.primaryModel?.label, "Claude 3.7 Sonnet");
  assert.equal(result.usage?.secondaryModel?.label, "Gemini Pro High");
  assert.equal(result.usage?.tertiaryModel?.label, "Gemini Flash");
});

test("parseAntigravityUserStatusResponse returns parse_error for invalid payload", async () => {
  const { parseAntigravityUserStatusResponse } = await import("./parser");

  const result = parseAntigravityUserStatusResponse({ code: 0, userStatus: { cascadeModelConfigData: {} } });

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "parse_error");
});
