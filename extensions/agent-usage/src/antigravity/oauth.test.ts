import assert from "node:assert/strict";
import test from "node:test";

import { fetchAntigravityOauthUsage } from "./oauth.ts";

const CLOUD_CODE_QUOTA_FIXTURE = {
  groups: [
    {
      buckets: [
        {
          bucketId: "gemini-weekly",
          displayName: "Weekly Limit Remaining",
          window: "weekly",
          resetTime: "2099-12-24T12:00:00Z",
          description: "Weekly Gemini pool",
          remainingFraction: 0.74,
        },
        {
          bucketId: "gemini-5h",
          displayName: "Five Hour Limit Remaining",
          window: "5h",
          resetTime: "2099-12-24T10:00:00Z",
          remainingFraction: 0.91,
        },
      ],
      displayName: "Gemini Models",
      description: "Models within this group: Gemini Flash, Gemini Pro",
    },
    {
      buckets: [
        {
          bucketId: "3p-weekly",
          displayName: "Weekly Limit Remaining",
          window: "weekly",
          resetTime: "2099-12-24T12:00:00Z",
          remainingFraction: 1,
        },
        {
          bucketId: "3p-5h",
          displayName: "Five Hour Limit Remaining",
          window: "5h",
          resetTime: "2099-12-24T10:00:00Z",
          remainingFraction: 0.5,
        },
      ],
      displayName: "Claude and GPT models",
      description: "Models within this group: Claude Opus, Claude Sonnet, GPT-OSS",
    },
  ],
  description: "Within each group, models share a weekly limit and a 5-hour limit.",
};

test("fetchAntigravityOauthUsage parses Cloud Code quota summary", async () => {
  const result = await fetchAntigravityOauthUsage(
    async () => "test-access-token",
    async (url, accessToken, body) => {
      assert.equal(accessToken, "test-access-token");
      assert.deepEqual(body, {});
      if (url.endsWith("retrieveUserQuotaSummary")) {
        return { data: CLOUD_CODE_QUOTA_FIXTURE, error: null };
      }
      if (url.endsWith("loadCodeAssist")) {
        return {
          data: {
            currentTier: { name: "Antigravity" },
            paidTier: { name: "Google AI Pro" },
          },
          error: null,
        };
      }
      assert.fail(`unexpected POST ${url}`);
    },
    async (url, accessToken) => {
      assert.equal(accessToken, "test-access-token");
      assert.match(url, /userinfo$/);
      return { data: { email: "user@example.com" }, error: null };
    },
  );

  assert.ok(result);
  assert.equal(result?.error, null);
  assert.equal(result?.usage?.quotaGroups?.length, 2);
  assert.equal(result?.usage?.quotaGroups?.[0].displayName, "Gemini Models");
  assert.equal(result?.usage?.quotaGroups?.[0].buckets[0].percentLeft, 74);
  assert.equal(result?.usage?.primaryModel, null);
  assert.equal(result?.usage?.accountEmail, "user@example.com");
  assert.equal(result?.usage?.accountPlan, "Google AI Pro");
});

test("fetchAntigravityOauthUsage keeps quota when identity helpers fail", async () => {
  const result = await fetchAntigravityOauthUsage(
    async () => "test-access-token",
    async (url) => {
      if (url.endsWith("retrieveUserQuotaSummary")) {
        return { data: CLOUD_CODE_QUOTA_FIXTURE, error: null };
      }
      return { data: null, error: { type: "api_error", message: "HTTP 500" } };
    },
    async () => ({ data: null, error: { type: "api_error", message: "HTTP 401" } }),
  );

  assert.equal(result?.error, null);
  assert.equal(result?.usage?.accountEmail, null);
  assert.equal(result?.usage?.accountPlan, null);
  assert.equal(result?.usage?.quotaGroups?.length, 2);
});

test("fetchAntigravityOauthUsage returns null when credentials are missing", async () => {
  const result = await fetchAntigravityOauthUsage(async () => null);
  assert.equal(result, null);
});
