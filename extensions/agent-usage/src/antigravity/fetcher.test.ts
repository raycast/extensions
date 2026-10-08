import assert from "node:assert/strict";
import test from "node:test";

test("mapAntigravityError maps probe not_running to user-facing error", async () => {
  const { mapAntigravityError } = await import("./fetcher.ts");
  const { AntigravityProbeError } = await import("./probe.ts");

  const mapped = mapAntigravityError(new AntigravityProbeError("not_running", "not running"));

  assert.equal(mapped.type, "not_running");
  assert.match(mapped.message, /not detected/i);
});

test("mapAntigravityError maps generic Error to unknown", async () => {
  const { mapAntigravityError } = await import("./fetcher.ts");

  const mapped = mapAntigravityError(new Error("boom"));

  assert.equal(mapped.type, "unknown");
  assert.equal(mapped.message, "boom");
});

test("fetchAntigravityUsage falls back to command model configs when user status cannot be parsed", async () => {
  const { fetchAntigravityUsage } = await import("./fetcher.ts");

  let callCount = 0;

  const fetchRawStatus = async (preferredSource?: "GetCommandModelConfigs" | "GetUserStatus") => {
    callCount += 1;

    if (callCount === 1) {
      assert.equal(preferredSource, undefined);
      return {
        source: "GetUserStatus" as const,
        payload: {
          code: 0,
          userStatus: {
            cascadeModelConfigData: {},
          },
        },
      };
    }

    assert.equal(preferredSource, "GetCommandModelConfigs");

    return {
      source: "GetCommandModelConfigs" as const,
      payload: {
        code: 0,
        clientModelConfigs: [
          {
            label: "Gemini Flash",
            modelOrAlias: { model: "gemini-flash" },
            quotaInfo: { remainingFraction: 0.4, resetTime: "2099-12-24T12:00:00Z" },
          },
        ],
      },
    };
  };

  const result = await fetchAntigravityUsage(fetchRawStatus as never);

  assert.equal(result.error, null);
  assert.ok(result.usage);
  assert.equal(result.usage?.primaryModel?.label, "Gemini Flash");
  assert.equal(callCount, 2);
});

test("fetchAntigravityUsage falls back to OAuth when local probe is not_running", async () => {
  const { fetchAntigravityUsage } = await import("./fetcher.ts");
  const { AntigravityProbeError } = await import("./probe.ts");

  let oauthCalled = false;

  const result = await fetchAntigravityUsage(
    async () => {
      throw new AntigravityProbeError("not_running", "not running");
    },
    async () => {
      oauthCalled = true;
      return {
        usage: {
          accountEmail: null,
          accountPlan: null,
          models: [],
          primaryModel: null,
          secondaryModel: null,
          tertiaryModel: null,
          quotaGroups: [
            {
              displayName: "Gemini Models",
              buckets: [
                {
                  bucketId: "gemini-weekly",
                  displayName: "Weekly",
                  window: "weekly",
                  percentLeft: 80,
                  resetsIn: "2d",
                  resetAt: null,
                },
              ],
            },
          ],
        },
        error: null,
      };
    },
  );

  assert.equal(oauthCalled, true);
  assert.equal(result.error, null);
  assert.equal(result.usage?.quotaGroups?.[0].buckets[0].percentLeft, 80);
});

test("fetchAntigravityUsage keeps probe error when OAuth credentials are unavailable", async () => {
  const { fetchAntigravityUsage } = await import("./fetcher.ts");
  const { AntigravityProbeError } = await import("./probe.ts");

  const result = await fetchAntigravityUsage(
    async () => {
      throw new AntigravityProbeError("not_running", "not running");
    },
    async () => null,
  );

  assert.equal(result.usage, null);
  assert.equal(result.error?.type, "not_running");
});
