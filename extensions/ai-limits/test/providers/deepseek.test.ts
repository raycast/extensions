import { describe, expect, it } from "vitest";
import { fakeDeps, NOW } from "../fake-deps";
import { fetchDeepSeekUsage, parseDeepSeekUsage } from "../../src/lib/providers/deepseek";
import { ProviderError } from "../../src/lib/types";

const BALANCE_URL = "https://api.deepseek.com/user/balance";

const BALANCE_JSON = {
  is_available: true,
  balance_infos: [{ currency: "USD", total_balance: "50.00", granted_balance: "10.00", topped_up_balance: "40.00" }],
};

const settings = { deepseekApiKey: "  sk-deepseek-test  " };

function errorOfSync(run: () => unknown): ProviderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error("expected a ProviderError");
}

describe("fetchDeepSeekUsage", () => {
  it("reads the balance with a bearer token and builds the USD balance and paid/granted note", async () => {
    const deps = fakeDeps({ routes: [{ prefix: BALANCE_URL, respond: { body: BALANCE_JSON } }] });
    const usage = await fetchDeepSeekUsage(deps, settings);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0].url).toBe(BALANCE_URL);
    expect(deps.requests[0].method).toBe("GET");
    expect(deps.requests[0].headers.authorization).toBe("Bearer sk-deepseek-test");
    expect(usage).toEqual({
      provider: "deepseek",
      windows: [],
      balances: [{ label: "Balance", amount: 50, currency: "USD" }],
      notes: ["Paid $40.00 · Granted $10.00"],
      source: "API key",
      fetchedAt: NOW,
    });
  });

  it("throws not-connected for an empty or whitespace key without any request", async () => {
    for (const deepseekApiKey of ["", "  ", undefined]) {
      const deps = fakeDeps({ routes: [{ prefix: BALANCE_URL, respond: { body: BALANCE_JSON } }] });
      const error = await fetchDeepSeekUsage(deps, { deepseekApiKey }).catch((e: unknown) => e);
      expect((error as ProviderError).kind).toBe("not-connected");
      expect((error as ProviderError).message).toBe("No DeepSeek API key");
      expect((error as ProviderError).hint).toContain("https://platform.deepseek.com/api_keys");
      expect(deps.requests).toHaveLength(0);
    }
  });

  it("names the preference in the auth hint when the key came from there, since Connect is hidden", async () => {
    const deps = fakeDeps({ routes: [{ prefix: BALANCE_URL, respond: { status: 401, body: {} } }] });
    const error = await fetchDeepSeekUsage(deps, { ...settings, deepseekApiKeySource: "preference" }).catch(
      (e: unknown) => e,
    );
    expect((error as ProviderError).hint).toBe("Check the DeepSeek API key in the extension preferences");
  });

  it("throws auth with the preferences hint on a 401", async () => {
    const deps = fakeDeps({ routes: [{ prefix: BALANCE_URL, respond: { status: 401, body: {} } }] });
    const error = await fetchDeepSeekUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("auth");
    expect((error as ProviderError).hint).toBe(
      "Choose Connect DeepSeek from this item's actions to enter a new key, or check the key in the extension preferences",
    );
  });

  it("throws http on a server error", async () => {
    const deps = fakeDeps({ routes: [{ prefix: BALANCE_URL, respond: { status: 500, body: {} } }] });
    const error = await fetchDeepSeekUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("http");
  });
});

describe("parseDeepSeekUsage", () => {
  it("shows every currency with USD first and one note per currency", () => {
    const usage = parseDeepSeekUsage(
      {
        is_available: true,
        balance_infos: [
          { currency: "CNY", total_balance: "120.50", granted_balance: "0.00", topped_up_balance: "120.50" },
          { currency: "USD", total_balance: "50.00", granted_balance: "10.00", topped_up_balance: "40.00" },
        ],
      },
      NOW,
    );
    expect(usage.balances).toEqual([
      { label: "Balance", amount: 50, currency: "USD" },
      { label: "Balance", amount: 120.5, currency: "CNY" },
    ]);
    expect(usage.notes).toEqual(["USD: Paid $40.00 · Granted $10.00", "CNY: Paid CN¥120.50 · Granted CN¥0.00"]);
  });

  it("notes that the balance can't be used when is_available is false", () => {
    const usage = parseDeepSeekUsage({ is_available: false, balance_infos: BALANCE_JSON.balance_infos }, NOW);
    expect(usage.notes).toContain("Balance can't be used for API calls right now");
  });

  it("asks for credits when the total is zero", () => {
    const usage = parseDeepSeekUsage(
      {
        is_available: false,
        balance_infos: [{ currency: "USD", total_balance: "0.00", granted_balance: "0.00", topped_up_balance: "0.00" }],
      },
      NOW,
    );
    expect(usage.balances).toEqual([{ label: "Balance", amount: 0, currency: "USD" }]);
    expect(usage.notes).toEqual([
      "Balance can't be used for API calls right now",
      "Add credits at platform.deepseek.com",
      "Paid $0.00 · Granted $0.00",
    ]);
  });

  it("asks for credits only when every currency is empty", () => {
    const partlyEmpty = parseDeepSeekUsage(
      {
        is_available: true,
        balance_infos: [
          { currency: "USD", total_balance: "0.00", granted_balance: "0.00", topped_up_balance: "0.00" },
          { currency: "CNY", total_balance: "9.00", granted_balance: "0.00", topped_up_balance: "9.00" },
        ],
      },
      NOW,
    );
    expect(partlyEmpty.notes).not.toContain("Add credits at platform.deepseek.com");

    const allEmpty = parseDeepSeekUsage(
      {
        is_available: true,
        balance_infos: [
          { currency: "USD", total_balance: "0", granted_balance: "0", topped_up_balance: "0" },
          { currency: "CNY", total_balance: "0", granted_balance: "0", topped_up_balance: "0" },
        ],
      },
      NOW,
    );
    expect(allEmpty.notes).toContain("Add credits at platform.deepseek.com");
  });

  it("accepts numeric amounts as well as strings", () => {
    const usage = parseDeepSeekUsage(
      { is_available: true, balance_infos: [{ currency: "USD", total_balance: 7.5 }] },
      NOW,
    );
    expect(usage.balances).toEqual([{ label: "Balance", amount: 7.5, currency: "USD" }]);
    expect(usage.notes).toEqual([]);
  });

  it("skips a row with no usable total and keeps the others", () => {
    const usage = parseDeepSeekUsage(
      {
        is_available: true,
        balance_infos: [
          { currency: "USD", total_balance: "not a number" },
          { currency: "CNY", total_balance: "3" },
        ],
      },
      NOW,
    );
    expect(usage.balances).toEqual([{ label: "Balance", amount: 3, currency: "CNY" }]);
  });

  it("throws parse when there is no balance at all", () => {
    expect(errorOfSync(() => parseDeepSeekUsage({ is_available: true, balance_infos: [] }, NOW)).kind).toBe("parse");
    expect(errorOfSync(() => parseDeepSeekUsage({ is_available: true }, NOW)).kind).toBe("parse");
  });

  it("throws parse when the body is not an object", () => {
    expect(errorOfSync(() => parseDeepSeekUsage("nope", NOW)).kind).toBe("parse");
  });
});
