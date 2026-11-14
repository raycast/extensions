import { describe, expect, it } from "vitest";
import { fakeDeps, NOW } from "../fake-deps";
import { fetchOpenRouterUsage } from "../../src/lib/providers/openrouter";
import { ProviderError } from "../../src/lib/types";

const KEY_JSON = {
  data: {
    label: "sk-or-v1-...abcd",
    limit: 50,
    limit_remaining: 12.3,
    limit_reset: "monthly",
    usage: 37.7,
    usage_daily: 1.2,
    usage_weekly: 5,
    usage_monthly: 20,
    is_free_tier: false,
  },
};
const CREDITS_JSON = { data: { total_credits: 100, total_usage: 37.7 } };

const KEY_URL = "https://openrouter.ai/api/v1/key";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";

function routes(key: unknown, credits: unknown, keyStatus = 200, creditsStatus = 200) {
  return [
    { prefix: KEY_URL, respond: { status: keyStatus, body: key } },
    { prefix: CREDITS_URL, respond: { status: creditsStatus, body: credits } },
  ];
}

const settings = { openrouterApiKey: "  sk-or-test  " };

describe("fetchOpenRouterUsage", () => {
  it("builds the key limit window, balance and spend note from realistic JSON", async () => {
    const deps = fakeDeps({ routes: routes(KEY_JSON, CREDITS_JSON) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage).toEqual({
      provider: "openrouter",
      windows: [
        {
          label: "Key Limit (Monthly)",
          usedPercent: ((50 - 12.3) / 50) * 100,
          resetsAt: null,
          detail: "$37.70 / $50.00",
        },
      ],
      balances: [{ label: "Balance", amount: 62.3, currency: "USD" }],
      notes: ["Spent today $1.20 · this week $5.00 · this month $20.00"],
      source: "API key",
      fetchedAt: NOW,
    });
  });

  it("sends the trimmed key, the app headers, and calls both endpoints", async () => {
    const deps = fakeDeps({ routes: routes(KEY_JSON, CREDITS_JSON) });
    await fetchOpenRouterUsage(deps, settings);

    expect(deps.requests.map((request) => request.url).sort()).toEqual([CREDITS_URL, KEY_URL].sort());
    for (const request of deps.requests) {
      expect(request.method).toBe("GET");
      expect(request.headers.authorization).toBe("Bearer sk-or-test");
      expect(request.headers["x-title"]).toBe("AI Limits");
      expect(request.headers["http-referer"]).toBe("https://raycast.com");
    }
  });

  it("throws not-connected for an empty or whitespace key without any request", async () => {
    for (const openrouterApiKey of ["", "   ", undefined]) {
      const deps = fakeDeps({ routes: routes(KEY_JSON, CREDITS_JSON) });
      const error = await fetchOpenRouterUsage(deps, { openrouterApiKey }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).kind).toBe("not-connected");
      expect((error as ProviderError).message).toBe("No OpenRouter API key");
      expect((error as ProviderError).hint).toContain("https://openrouter.ai/settings/keys");
      expect(deps.requests).toHaveLength(0);
    }
  });

  it("throws auth with the preferences hint when the key is rejected", async () => {
    const deps = fakeDeps({ routes: routes({ error: "unauthorized" }, { error: "unauthorized" }, 401, 401) });
    const error = await fetchOpenRouterUsage(deps, settings).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("auth");
    expect((error as ProviderError).hint).toBe(
      "Choose Connect OpenRouter from this item's actions to sign in again, or check the key in the extension preferences",
    );
  });

  it("names the preference in the auth hint when the key came from there, since Connect is hidden", async () => {
    const deps = fakeDeps({ routes: routes({ error: "unauthorized" }, { error: "unauthorized" }, 401, 401) });
    const error = await fetchOpenRouterUsage(deps, { ...settings, openrouterApiKeySource: "preference" }).catch(
      (e: unknown) => e,
    );
    expect((error as ProviderError).hint).toBe("Check the OpenRouter API key in the extension preferences");
  });

  it("rethrows the key call's error when both calls fail", async () => {
    const deps = fakeDeps({ routes: routes({}, {}, 500, 403) });
    const error = await fetchOpenRouterUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("http");
    expect((error as ProviderError).message).toBe("OpenRouter returned HTTP 500");
  });

  it("keeps the key data and adds a note when credits need a different key", async () => {
    const deps = fakeDeps({ routes: routes(KEY_JSON, { error: "forbidden" }, 200, 403) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.balances).toEqual([]);
    expect(usage.windows).toHaveLength(1);
    expect(usage.notes).toContain("Credit balance needs a key with credits access");
  });

  it("keeps the wait of a 429 on one call alongside the data from the other", async () => {
    const deps = fakeDeps({
      routes: [
        { prefix: KEY_URL, respond: { status: 429, headers: { "Retry-After": "600" }, body: {} } },
        { prefix: CREDITS_URL, respond: { body: CREDITS_JSON } },
      ],
    });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.balances).toEqual([{ label: "Balance", amount: 62.3, currency: "USD" }]);
    expect(usage.retryAt).toBe(NOW + 600_000);
  });

  it("says the balance is unavailable when the credits body is malformed", async () => {
    const deps = fakeDeps({ routes: routes(KEY_JSON, { data: { total_credits: "lots" } }) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.balances).toEqual([]);
    expect(usage.notes).toContain("Credit balance unavailable");
    expect(usage.notes).not.toContain("Credit balance needs a key with credits access");
  });

  it("says the balance is unavailable when the credits call answers 500", async () => {
    const deps = fakeDeps({ routes: routes(KEY_JSON, { error: "boom" }, 200, 500) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.balances).toEqual([]);
    expect(usage.notes).toContain("Credit balance unavailable");
  });

  it("shows only the spend note for an uncapped key and a null limit", async () => {
    const uncapped = {
      data: { label: "k", limit: null, limit_remaining: null, limit_reset: null, usage: 3, is_free_tier: true },
    };
    const deps = fakeDeps({ routes: routes(uncapped, CREDITS_JSON) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.windows).toEqual([]);
    expect(usage.plan).toBe("Free tier");
    expect(usage.notes).toEqual([]);
    expect(usage.balances).toEqual([{ label: "Balance", amount: 62.3, currency: "USD" }]);
  });

  it("falls back to usage when limit_remaining is missing and clamps the percent", async () => {
    const key = { data: { limit: 10, limit_remaining: null, limit_reset: null, usage: 15, is_free_tier: false } };
    const deps = fakeDeps({ routes: routes(key, CREDITS_JSON) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.windows).toEqual([
      { label: "Key Limit", usedPercent: 100, resetsAt: null, detail: "$10.00 / $10.00" },
    ]);
  });

  it("reports a key failure as a note when credits still answer", async () => {
    const deps = fakeDeps({ routes: routes({ error: "boom" }, CREDITS_JSON, 500, 200) });
    const usage = await fetchOpenRouterUsage(deps, settings);

    expect(usage.windows).toEqual([]);
    expect(usage.balances).toEqual([{ label: "Balance", amount: 62.3, currency: "USD" }]);
    expect(usage.notes[0]).toMatch(/^Key limits unavailable: /);
  });

  it("throws parse when the key response has no data object", async () => {
    // Credits must fail too, otherwise the key failure is only a note.
    const deps = fakeDeps({ routes: routes({ nope: true }, { error: "x" }, 200, 500) });
    const error = await fetchOpenRouterUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("parse");
  });

  it("throws parse when the key response is not JSON", async () => {
    const deps = fakeDeps({ routes: routes("<html>", { error: "x" }, 200, 500) });
    const error = await fetchOpenRouterUsage(deps, settings).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("parse");
  });
});
