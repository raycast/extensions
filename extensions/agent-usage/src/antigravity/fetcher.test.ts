import test from "node:test";
import assert from "node:assert/strict";

test("mapAntigravityError maps probe not_running to user-facing error", async () => {
  const { mapAntigravityError } = await import("./fetcher");
  const { AntigravityProbeError } = await import("./probe");

  const mapped = mapAntigravityError(new AntigravityProbeError("not_running", "not running"));

  assert.equal(mapped.type, "not_running");
  assert.match(mapped.message, /not detected/i);
});

test("mapAntigravityError maps generic Error to unknown", async () => {
  const { mapAntigravityError } = await import("./fetcher");

  const mapped = mapAntigravityError(new Error("boom"));

  assert.equal(mapped.type, "unknown");
  assert.equal(mapped.message, "boom");
});

test("fetchAntigravityUsage falls back to command model configs when user status cannot be parsed", async () => {
  const { fetchAntigravityUsage } = await import("./fetcher");

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
