import { describe, expect, it } from "vitest";
import { fakeDeps, NOW } from "../fake-deps";
import { fetchMoonshotUsage, parseMoonshotUsage } from "../../src/lib/providers/moonshot";
import { ProviderError } from "../../src/lib/types";

const GLOBAL_URL = "https://api.moonshot.ai/v1/users/me/balance";
const CHINA_URL = "https://api.moonshot.cn/v1/users/me/balance";

const BALANCE_JSON = {
  code: 0,
  data: { available_balance: 49.58, voucher_balance: 46.58, cash_balance: 3.0 },
  scode: "0x0",
  status: true,
};

const settings = { moonshotApiKey: "  sk-moonshot-test  " };

function errorOfSync(run: () => unknown): ProviderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error("expected a ProviderError");
}

describe("fetchMoonshotUsage", () => {
  it("reads the global balance in US dollars with a bearer token", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { body: BALANCE_JSON } }] });
    const usage = await fetchMoonshotUsage(deps, settings);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0].url).toBe(GLOBAL_URL);
    expect(deps.requests[0].headers.authorization).toBe("Bearer sk-moonshot-test");
    expect(usage).toEqual({
      provider: "moonshot",
      windows: [],
      balances: [{ label: "Available", amount: 49.58, currency: "USD" }],
      notes: ["Voucher $46.58 · Cash $3.00"],
      source: "API key",
      fetchedAt: NOW,
    });
  });

  it("switches to the China host and yuan when the region is china", async () => {
    const deps = fakeDeps({ routes: [{ prefix: CHINA_URL, respond: { body: BALANCE_JSON } }] });
    const usage = await fetchMoonshotUsage(deps, { moonshotApiKey: "k", moonshotRegion: "china" });

    expect(deps.requests[0].url).toBe(CHINA_URL);
    expect(usage.balances).toEqual([{ label: "Available", amount: 49.58, currency: "CNY" }]);
  });

  it("throws not-connected for an empty or whitespace key without any request", async () => {
    for (const moonshotApiKey of ["", "  ", undefined]) {
      const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { body: BALANCE_JSON } }] });
      const error = await fetchMoonshotUsage(deps, { moonshotApiKey }).catch((e: unknown) => e);
      expect((error as ProviderError).kind).toBe("not-connected");
      expect((error as ProviderError).message).toBe("No Moonshot API key");
      expect((error as ProviderError).hint).toContain("https://platform.moonshot.ai/console/api-keys");
      expect(deps.requests).toHaveLength(0);
    }
  });

  it("names the preference in the auth hint when the key came from there, since Connect is hidden", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { status: 401, body: {} } }] });
    const error = await fetchMoonshotUsage(deps, { ...settings, moonshotApiKeySource: "preference" }).catch(
      (e: unknown) => e,
    );
    expect((error as ProviderError).hint).toBe("Check the Moonshot API key and region in the extension preferences");
  });

  it("throws auth with the preferences hint on a 401", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { status: 401, body: {} } }] });
    const error = await fetchMoonshotUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("auth");
    expect((error as ProviderError).hint).toBe(
      "Choose Connect Moonshot from this item's actions to enter a new key, or check the key and region in the extension preferences",
    );
  });

  it("throws parse on a body that isn't JSON", async () => {
    const deps = fakeDeps({ routes: [{ prefix: GLOBAL_URL, respond: { body: "<html>" } }] });
    const error = await fetchMoonshotUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("parse");
  });
});

describe("parseMoonshotUsage", () => {
  it("notes a negative cash balance", () => {
    const usage = parseMoonshotUsage(
      {
        code: 0,
        data: { available_balance: 46.58, voucher_balance: 46.58, cash_balance: -2.5 },
        scode: "0x0",
        status: true,
      },
      "USD",
      NOW,
    );
    expect(usage.balances).toEqual([{ label: "Available", amount: 46.58, currency: "USD" }]);
    expect(usage.notes).toEqual(["Voucher $46.58 · Cash -$2.50", "Cash balance is negative: -$2.50"]);
  });

  it("omits the breakdown when voucher or cash is missing", () => {
    const usage = parseMoonshotUsage({ code: 0, data: { available_balance: 10 }, status: true }, "CNY", NOW);
    expect(usage.balances).toEqual([{ label: "Available", amount: 10, currency: "CNY" }]);
    expect(usage.notes).toEqual([]);
  });

  it("accepts numeric strings for the amounts", () => {
    const usage = parseMoonshotUsage(
      { code: 0, data: { available_balance: "12.5", voucher_balance: "10", cash_balance: "2.5" }, status: true },
      "USD",
      NOW,
    );
    expect(usage.balances[0].amount).toBe(12.5);
    expect(usage.notes).toEqual(["Voucher $10.00 · Cash $2.50"]);
  });

  it("throws http when the body reports a non-zero code or status false", () => {
    const error = errorOfSync(() => parseMoonshotUsage({ code: 1001, status: false, scode: "0x1" }, "USD", NOW));
    expect(error.kind).toBe("http");
    expect(error.message).toBe("Moonshot API error: code 1001");
    expect(errorOfSync(() => parseMoonshotUsage({ code: 0, status: false, data: {} }, "USD", NOW)).kind).toBe("http");
  });

  it("throws parse when available_balance is missing", () => {
    expect(errorOfSync(() => parseMoonshotUsage({ code: 0, status: true, data: {} }, "USD", NOW)).kind).toBe("parse");
    expect(errorOfSync(() => parseMoonshotUsage({ code: 0, status: true }, "USD", NOW)).kind).toBe("parse");
  });

  it("throws parse when the body is not an object", () => {
    expect(errorOfSync(() => parseMoonshotUsage(null, "USD", NOW)).kind).toBe("parse");
  });
});
