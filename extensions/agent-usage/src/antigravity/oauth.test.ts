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
      assert.match(url, /retrieveUserQuotaSummary$/);
      assert.equal(accessToken, "test-access-token");
      assert.deepEqual(body, {});
      return { data: CLOUD_CODE_QUOTA_FIXTURE, error: null };
    },
  );

  assert.ok(result);
  assert.equal(result?.error, null);
  assert.equal(result?.usage?.quotaGroups?.length, 2);
  assert.equal(result?.usage?.quotaGroups?.[0].displayName, "Gemini Models");
  assert.equal(result?.usage?.quotaGroups?.[0].buckets[0].percentLeft, 74);
  assert.equal(result?.usage?.primaryModel, null);
});

test("fetchAntigravityOauthUsage returns null when credentials are missing", async () => {
  const result = await fetchAntigravityOauthUsage(async () => null);
  assert.equal(result, null);
});
