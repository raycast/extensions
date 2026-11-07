import { describe, expect, it } from "vitest";
import { fetchCopilotUsage, parseCopilotUsage } from "../../src/lib/providers/copilot";
import { ProviderError, Settings } from "../../src/lib/types";
import { fakeDeps, NOW } from "../fake-deps";

const USAGE_URL = "https://api.github.com/copilot_internal/user";
const RESET_ISO = "2026-11-01";
const RESET_MS = Date.parse("2026-11-01T00:00:00Z");

// A paid individual account, as /copilot_internal/user answers it.
const individual = {
  copilot_plan: "individual",
  quota_reset_date: RESET_ISO,
  token_based_billing: false,
  quota_snapshots: {
    premium_interactions: {
      entitlement: 300,
      remaining: 120.5,
      percent_remaining: 40.2,
      unlimited: false,
      quota_id: "premium_interactions",
    },
    chat: { entitlement: 0, remaining: 0, percent_remaining: 100, unlimited: true, quota_id: "chat" },
    completions: {
      entitlement: 2000,
      remaining: 1500,
      percent_remaining: 75,
      unlimited: false,
      quota_id: "completions",
    },
  },
  limited_user_quotas: { chat: 40, completions: 1500 },
  monthly_quotas: { chat: 50, completions: 2000 },
};

// A free account: the snapshots are missing and the quotas come as flat maps.
const free = {
  copilot_plan: "free",
  quota_reset_date: RESET_ISO,
  limited_user_quotas: { chat: 40, completions: 1500 },
  monthly_quotas: { chat: 50, completions: 2000 },
};

function copilotRoutes(body: unknown, status = 200) {
  return [{ prefix: USAGE_URL, respond: { status, body } }];
}

describe("parseCopilotUsage", () => {
  it("reads premium, chat and completions snapshots from a paid account", () => {
    const parsed = parseCopilotUsage(individual);

    expect(parsed.plan).toBe("Pro");
    expect(parsed.windows.map((w) => w.label)).toEqual(["Premium Requests", "Completions"]);
    expect(parsed.windows[0].usedPercent).toBeCloseTo(59.8);
    expect(parsed.windows[0]).toMatchObject({ detail: "179.5 / 300 used", resetsAt: RESET_MS });
    expect(parsed.windows[1].usedPercent).toBeCloseTo(25);
    expect(parsed.windows[1]).toMatchObject({ detail: "500 / 2000 used", resetsAt: RESET_MS });
    expect(parsed.notes).toEqual(["Chat is unlimited on this plan."]);
  });

  it("reads the flat quota maps of the free plan", () => {
    const parsed = parseCopilotUsage(free);

    expect(parsed.plan).toBe("Free");
    expect(parsed.windows).toHaveLength(2);
    expect(parsed.windows[0]).toMatchObject({ label: "Chat", resetsAt: RESET_MS, detail: "10 / 50 used" });
    expect(parsed.windows[0].usedPercent).toBeCloseTo(20);
    expect(parsed.windows[1]).toMatchObject({ label: "Completions", detail: "500 / 2000 used" });
    expect(parsed.windows[1].usedPercent).toBeCloseTo(25);
    expect(parsed.notes).toEqual([]);
  });

  it("skips free-plan quotas with no monthly total", () => {
    const parsed = parseCopilotUsage({
      copilot_plan: "free",
      limited_user_quotas: { chat: 40, completions: 1500 },
      monthly_quotas: { chat: 0, completions: 2000 },
    });
    expect(parsed.windows.map((w) => w.label)).toEqual(["Completions"]);
  });

  it("works out the percent from the entitlement when percent_remaining is missing", () => {
    const parsed = parseCopilotUsage({
      quota_snapshots: { premium_interactions: { entitlement: 300, remaining: 150 } },
    });
    expect(parsed.windows).toEqual([
      { label: "Premium Requests", usedPercent: 50, resetsAt: null, detail: "150 / 300 used" },
    ]);
  });

  it("clamps the percent and rounds the detail to one decimal place", () => {
    const parsed = parseCopilotUsage({
      quota_snapshots: {
        premium_interactions: { entitlement: 300, remaining: 120.04, percent_remaining: 150 },
        chat: { entitlement: 10, remaining: 3.14159, percent_remaining: 31.4159 },
      },
    });
    expect(parsed.windows[0].usedPercent).toBe(0);
    expect(parsed.windows[0].detail).toBe("180 / 300 used");
    expect(parsed.windows[1].detail).toBe("6.9 / 10 used");
  });

  it("reads a date-only reset as midnight UTC and leaves it null when missing", () => {
    expect(parseCopilotUsage(individual).windows[0].resetsAt).toBe(RESET_MS);
    expect(parseCopilotUsage({ ...individual, quota_reset_date: undefined }).windows[0].resetsAt).toBeNull();
  });

  it("notes unlimited quotas and returns no windows when every quota is unlimited", () => {
    const parsed = parseCopilotUsage({
      copilot_plan: "enterprise",
      quota_snapshots: {
        premium_interactions: { unlimited: true },
        chat: { unlimited: true },
        completions: { unlimited: true },
      },
    });
    expect(parsed.windows).toEqual([]);
    expect(parsed.notes).toEqual(["Premium Requests, Chat and Completions are unlimited on this plan."]);
  });

  it.each([
    ["individual", "Pro"],
    ["individual_pro", "Pro+"],
    ["business", "Business"],
    ["enterprise", "Enterprise"],
    ["free", "Free"],
    ["free_limited_copilot", "Free"],
    ["some_new_plan", "Some New Plan"],
  ])("maps the %s plan to %s", (copilotPlan, name) => {
    const parsed = parseCopilotUsage({
      copilot_plan: copilotPlan,
      quota_snapshots: { chat: { unlimited: true } },
    });
    expect(parsed.plan).toBe(name);
  });

  it("leaves the plan out when none is given", () => {
    expect(parseCopilotUsage({ quota_snapshots: { chat: { unlimited: true } } }).plan).toBeUndefined();
  });

  it("skips snapshots that have neither a percent nor a usable entitlement", () => {
    const parsed = parseCopilotUsage({
      quota_snapshots: {
        premium_interactions: { entitlement: 0, remaining: 0 },
        completions: { remaining: "lots" },
        chat: { percent_remaining: "95" },
      },
    });
    expect(parsed.windows).toEqual([{ label: "Chat", usedPercent: 5, resetsAt: null }]);
  });

  it("throws a parse error when nothing usable came back", () => {
    for (const json of [{}, null, [], "nope", { quota_snapshots: {} }, { quota_snapshots: { chat: "x" } }]) {
      expect(() => parseCopilotUsage(json)).toThrow(ProviderError);
      expect(() => parseCopilotUsage(json)).toThrowError(/no usable quotas/);
    }
  });
});

describe("fetchCopilotUsage", () => {
  it("sends the GitHub token and the headers GitHub expects", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    const usage = await fetchCopilotUsage(deps, { githubToken: "ghp_pref" });

    expect(deps.requests).toHaveLength(1);
    const request = deps.requests[0];
    expect(request).toMatchObject({ url: USAGE_URL, method: "GET" });
    expect(request.headers).toMatchObject({
      authorization: "token ghp_pref",
      accept: "application/json",
      "x-github-api-version": "2025-04-01",
      "user-agent": "AI-Limits-Raycast",
    });
    expect(usage).toMatchObject({
      provider: "copilot",
      plan: "Pro",
      source: "GitHub token",
      fetchedAt: NOW,
      balances: [],
      notes: ["Chat is unlimited on this plan."],
    });
    expect(usage.account).toBeUndefined();
  });

  it("trims the preference token", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    await fetchCopilotUsage(deps, { githubToken: "  ghp_pref  " });
    expect(deps.requests[0].headers.authorization).toBe("token ghp_pref");
  });

  it("prefers the preference token over the token from signing in", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    const usage = await fetchCopilotUsage(deps, { githubToken: "ghp_pref", githubOAuthToken: "gho_oauth" });
    expect(deps.requests[0].headers.authorization).toBe("token ghp_pref");
    expect(usage.source).toBe("GitHub token");
  });

  it("uses the token from signing in when the preference is blank", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    const usage = await fetchCopilotUsage(deps, { githubToken: "   ", githubOAuthToken: "gho_oauth" });
    expect(deps.requests[0].headers.authorization).toBe("token gho_oauth");
    expect(usage.source).toBe("GitHub sign-in");
  });

  it("reports not-connected with the gh hint when there is no token", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    const error = await fetchCopilotUsage(deps, {}).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "not-connected", message: "No GitHub token for Copilot" });
    expect((error as ProviderError).hint).toContain("gh auth token");
    expect(deps.requests).toEqual([]);
  });

  it("treats blank tokens as no token", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(individual) });
    const settings: Settings = { githubToken: " ", githubOAuthToken: "" };
    await expect(fetchCopilotUsage(deps, settings)).rejects.toMatchObject({ kind: "not-connected" });
    expect(deps.requests).toEqual([]);
  });

  it("hints at the preference when the preference token is rejected", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ message: "Bad credentials" }, 401) });
    await expect(fetchCopilotUsage(deps, { githubToken: "ghp_bad" })).rejects.toMatchObject({
      kind: "auth",
      hint: "Check the GitHub token in preferences",
    });
  });

  it("hints at signing in again when the signed-in token is rejected", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ message: "Bad credentials" }, 403) });
    await expect(fetchCopilotUsage(deps, { githubOAuthToken: "gho_old" })).rejects.toMatchObject({
      kind: "auth",
      hint: "Choose Connect GitHub from this item's actions to sign in again",
    });
  });

  it("reports not-connected when the account has no Copilot seat (404)", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ message: "Not Found" }, 404) });
    const error = await fetchCopilotUsage(deps, { githubToken: "ghp_ok" }).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "not-connected", message: "No Copilot subscription on this GitHub account" });
    expect((error as ProviderError).hint).toContain("github.com/settings/copilot");
  });

  it("names the preference, not Connect GitHub, in the 404 hint when a preference token is set", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ message: "Not Found" }, 404) });
    const error = await fetchCopilotUsage(deps, { githubToken: "ghp_ok" }).catch((e: unknown) => e);

    expect((error as ProviderError).hint).not.toContain("Connect GitHub");
    expect((error as ProviderError).hint).toContain("GitHub Token for Copilot preference");
  });

  it("names Connect GitHub in the 404 hint when the token came from signing in", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ message: "Not Found" }, 404) });
    const error = await fetchCopilotUsage(deps, { githubOAuthToken: "gho_ok" }).catch((e: unknown) => e);

    expect((error as ProviderError).hint).toContain("Choose Connect GitHub from this item's actions");
  });

  it("passes other HTTP failures through as http errors", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({}, 500) });
    await expect(fetchCopilotUsage(deps, { githubToken: "ghp_ok" })).rejects.toMatchObject({ kind: "http" });
  });

  it("reports a parse error when the answer is not JSON", async () => {
    const deps = fakeDeps({ routes: copilotRoutes("<html>Unicorn</html>") });
    await expect(fetchCopilotUsage(deps, { githubToken: "ghp_ok" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports a parse error when the answer has no quotas", async () => {
    const deps = fakeDeps({ routes: copilotRoutes({ copilot_plan: "individual" }) });
    await expect(fetchCopilotUsage(deps, { githubToken: "ghp_ok" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("returns the free plan's windows end to end", async () => {
    const deps = fakeDeps({ routes: copilotRoutes(free) });
    const usage = await fetchCopilotUsage(deps, { githubToken: "ghp_ok" });
    expect(usage.plan).toBe("Free");
    expect(usage.windows.map((w) => w.label)).toEqual(["Chat", "Completions"]);
  });
});
