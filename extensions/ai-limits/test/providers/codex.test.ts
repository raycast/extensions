import { describe, expect, it } from "vitest";
import { fakeDeps, fakeJwt, HOME, NOW } from "../fake-deps";
import { fetchCodexUsage, parseCodexUsage } from "../../src/lib/providers/codex";
import { ProviderError, Settings } from "../../src/lib/types";

const AUTH_FILE = `${HOME}/.codex/auth.json`;
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const NO_SETTINGS: Settings = {};

const ID_TOKEN = fakeJwt({
  email: "omar@example.com",
  "https://api.openai.com/auth": { chatgpt_account_id: "acct_jwt_987", chatgpt_plan_type: "plus" },
});

const USAGE_JSON = {
  plan_type: "plus",
  rate_limit: {
    primary_window: { used_percent: 42, reset_at: 1760450000, limit_window_seconds: 18000 },
    secondary_window: { used_percent: 10, reset_at: 1760900000, limit_window_seconds: 604800 },
  },
  credits: { has_credits: true, unlimited: false, balance: "125.5" },
  additional_rate_limits: [
    {
      limit_name: "GPT-5-Codex-Spark",
      metered_feature: "codex_spark",
      rate_limit: {
        primary_window: { used_percent: 3, reset_at: 1760450000, limit_window_seconds: 18000 },
        secondary_window: { used_percent: 1, reset_at: 1760900000, limit_window_seconds: 604800 },
      },
    },
  ],
};

const AUTH_HINT_TEXT = "Run `codex` in a terminal to refresh your login";

function authFile(tokens: Record<string, unknown>): string {
  return JSON.stringify({ OPENAI_API_KEY: null, tokens, last_refresh: "2026-10-10T08:00:00Z" });
}

function usageRoute(body: unknown = USAGE_JSON, status = 200) {
  return { prefix: USAGE_URL, respond: { status, body } };
}

describe("parseCodexUsage", () => {
  it("maps the plan, the session and weekly windows, the additional model and the credits", () => {
    const usage = parseCodexUsage(USAGE_JSON);

    expect(usage.plan).toBe("Plus");
    expect(usage.windows).toEqual([
      { label: "Session", usedPercent: 42, resetsAt: 1760450000 * 1000 },
      { label: "Weekly", usedPercent: 10, resetsAt: 1760900000 * 1000 },
      { label: "GPT-5-Codex-Spark Session", usedPercent: 3, resetsAt: 1760450000 * 1000 },
      { label: "GPT-5-Codex-Spark Weekly", usedPercent: 1, resetsAt: 1760900000 * 1000 },
    ]);
    expect(usage.balances).toEqual([{ label: "Credits", amount: 125.5, currency: "credits" }]);
    expect(usage.notes).toEqual([]);
  });

  it.each([
    [3600, "Session"],
    [86400, "Session"],
    [604800, "Weekly"],
    [604800 + 86400, "Weekly"],
    [2_592_000, "30-Day"],
  ])("labels a %i second window as %j", (seconds, label) => {
    const usage = parseCodexUsage({
      rate_limit: { primary_window: { used_percent: 1, limit_window_seconds: seconds } },
    });

    expect(usage.windows[0].label).toBe(label);
  });

  it("falls back to position when the window length is missing", () => {
    const usage = parseCodexUsage({
      rate_limit: {
        primary_window: { used_percent: 5, reset_at: 1760450000 },
        secondary_window: { used_percent: 6, reset_at: 1760900000 },
      },
    });

    expect(usage.windows.map((window) => window.label)).toEqual(["Session", "Weekly"]);
  });

  it("accepts percentages sent as strings and clamps them to 0..100", () => {
    const usage = parseCodexUsage({
      rate_limit: {
        primary_window: { used_percent: "130", reset_at: 1760450000 },
        secondary_window: { used_percent: "7.5", reset_at: 1760900000 },
      },
    });

    expect(usage.windows.map((window) => window.usedPercent)).toEqual([100, 7.5]);
  });

  it("skips windows with null or missing percentages and additional limits without a name", () => {
    const usage = parseCodexUsage({
      rate_limit: {
        primary_window: { used_percent: null, reset_at: 1760450000 },
        secondary_window: { used_percent: 12, reset_at: null, limit_window_seconds: 604800 },
      },
      additional_rate_limits: [
        { rate_limit: { primary_window: { used_percent: 9 } } },
        { limit_name: "Nameless-Free", rate_limit: { secondary_window: null } },
      ],
    });

    expect(usage.windows).toEqual([{ label: "Weekly", usedPercent: 12, resetsAt: null }]);
  });

  it.each([
    ["free", "Free"],
    ["plus", "Plus"],
    ["pro", "Pro"],
    ["team", "Team"],
    ["business", "Business"],
    ["enterprise", "Enterprise"],
    ["edu", "Edu"],
    ["pro_lite", "Pro Lite"],
    ["go", "Go"],
  ])("maps plan_type %j to %j", (planType, plan) => {
    expect(parseCodexUsage({ ...USAGE_JSON, plan_type: planType }).plan).toBe(plan);
  });

  it("reports unlimited credits as a note instead of a balance", () => {
    const usage = parseCodexUsage({ ...USAGE_JSON, credits: { has_credits: true, unlimited: true, balance: "0" } });

    expect(usage.balances).toEqual([]);
    expect(usage.notes).toEqual(["Unlimited credits"]);
  });

  it("leaves out credits when the account has none or the balance is not a number", () => {
    expect(parseCodexUsage({ ...USAGE_JSON, credits: { has_credits: false, balance: "0" } }).balances).toEqual([]);
    expect(parseCodexUsage({ ...USAGE_JSON, credits: { has_credits: true, balance: "lots" } }).balances).toEqual([]);
  });

  it("throws a parse error when nothing usable came back", () => {
    expect(() => parseCodexUsage({})).toThrow(new ProviderError("parse", "Codex returned no usage data"));
    expect(() => parseCodexUsage(["not", "an", "object"])).toThrow(ProviderError);
  });
});

describe("fetchCodexUsage", () => {
  it("adds the stale-login sentence to the hint when auth.json is more than 8 days old", async () => {
    const deps = fakeDeps({
      files: {
        [AUTH_FILE]: JSON.stringify({
          tokens: { access_token: "access-token-abc" },
          last_refresh: "2026-10-01T08:00:00Z",
        }),
      },
      routes: [usageRoute({ error: "expired" }, 401)],
    });

    const error = await fetchCodexUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "auth",
      hint: "Your Codex login is more than 8 days old. Run `codex` in a terminal to refresh it",
    });
  });

  it("keeps the normal hint when the login is recent or last_refresh is missing", async () => {
    const recent = fakeDeps({
      files: { [AUTH_FILE]: JSON.stringify({ tokens: { access_token: "a" }, last_refresh: "2026-10-12T08:00:00Z" }) },
      routes: [usageRoute({}, 401)],
    });
    const missing = fakeDeps({
      files: { [AUTH_FILE]: JSON.stringify({ tokens: { access_token: "a" } }) },
      routes: [usageRoute({}, 401)],
    });

    await expect(fetchCodexUsage(recent, NO_SETTINGS)).rejects.toMatchObject({ hint: AUTH_HINT_TEXT });
    await expect(fetchCodexUsage(missing, NO_SETTINGS)).rejects.toMatchObject({ hint: AUTH_HINT_TEXT });
  });

  it("sends the access token and account id, and maps the result", async () => {
    const deps = fakeDeps({
      files: {
        [AUTH_FILE]: authFile({
          id_token: ID_TOKEN,
          access_token: "access-token-abc",
          refresh_token: "refresh-secret",
          account_id: "acct_123",
        }),
      },
      routes: [usageRoute()],
    });

    const usage = await fetchCodexUsage(deps, NO_SETTINGS);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0]).toMatchObject({ url: USAGE_URL, method: "GET" });
    expect(deps.requests[0].headers).toMatchObject({
      authorization: "Bearer access-token-abc",
      "chatgpt-account-id": "acct_123",
      "user-agent": "AI-Limits-Raycast",
    });
    expect(usage).toMatchObject({
      provider: "codex",
      plan: "Plus",
      account: "omar@example.com",
      source: "Codex CLI login",
      notes: [],
      fetchedAt: NOW,
    });
    expect(usage.windows).toHaveLength(4);
    expect(usage.balances).toEqual([{ label: "Credits", amount: 125.5, currency: "credits" }]);
  });

  it("reads camelCase token fields", async () => {
    const deps = fakeDeps({
      files: {
        [AUTH_FILE]: authFile({ idToken: ID_TOKEN, accessToken: "access-camel", accountId: "acct_camel" }),
      },
      routes: [usageRoute()],
    });

    const usage = await fetchCodexUsage(deps, NO_SETTINGS);

    expect(deps.requests[0].headers).toMatchObject({
      authorization: "Bearer access-camel",
      "chatgpt-account-id": "acct_camel",
    });
    expect(usage.account).toBe("omar@example.com");
  });

  it("takes the account id from the id_token claim when tokens.account_id is missing", async () => {
    const deps = fakeDeps({
      files: { [AUTH_FILE]: authFile({ id_token: ID_TOKEN, access_token: "access-token-abc" }) },
      routes: [usageRoute()],
    });

    await fetchCodexUsage(deps, NO_SETTINGS);

    expect(deps.requests[0].headers["chatgpt-account-id"]).toBe("acct_jwt_987");
  });

  it("omits the account header when no account id is known", async () => {
    const deps = fakeDeps({
      files: { [AUTH_FILE]: authFile({ access_token: "access-token-abc" }) },
      routes: [usageRoute()],
    });

    const usage = await fetchCodexUsage(deps, NO_SETTINGS);

    expect(deps.requests[0].headers["chatgpt-account-id"]).toBeUndefined();
    expect(usage.account).toBeUndefined();
  });

  it("reads auth.json from CODEX_HOME when it is set", async () => {
    const deps = fakeDeps({
      files: { "/Volumes/work/codex/auth.json": authFile({ access_token: "access-token-abc" }) },
      routes: [usageRoute()],
    });
    deps.env.CODEX_HOME = "/Volumes/work/codex";

    await fetchCodexUsage(deps, NO_SETTINGS);

    expect(deps.requests).toHaveLength(1);
  });

  it("reads auth.json from the folder in settings before CODEX_HOME", async () => {
    const deps = fakeDeps({
      files: { "/Volumes/shell/codex/auth.json": authFile({ access_token: "access-token-abc" }) },
      routes: [usageRoute()],
    });
    deps.env.CODEX_HOME = "/Volumes/work/codex";

    await fetchCodexUsage(deps, { codexHome: "/Volumes/shell/codex" });

    expect(deps.requests).toHaveLength(1);
  });

  it("is not-connected when the Codex CLI has never signed in", async () => {
    const deps = fakeDeps();

    const error = await fetchCodexUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "not-connected" });
    expect((error as ProviderError).hint).toContain("codex login");
    expect(deps.requests).toEqual([]);
  });

  it("is not-connected with the API key message when only OPENAI_API_KEY is set", async () => {
    const deps = fakeDeps({
      files: { [AUTH_FILE]: JSON.stringify({ OPENAI_API_KEY: "sk-proj-secret", tokens: null }) },
    });

    const error = await fetchCodexUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "not-connected", message: "Codex is using an API key" });
    expect((error as ProviderError).hint).toContain("Sign in with ChatGPT");
    expect(JSON.stringify(error)).not.toContain("sk-proj-secret");
    expect(deps.requests).toEqual([]);
  });

  it("throws a parse error for a malformed auth.json", async () => {
    const deps = fakeDeps({ files: { [AUTH_FILE]: '{"tokens": {"access_token": ' } });

    await expect(fetchCodexUsage(deps, NO_SETTINGS)).rejects.toMatchObject({ kind: "parse" });
    expect(deps.requests).toEqual([]);
  });

  it.each([401, 403])("throws an auth error with the refresh hint on HTTP %i and does not retry", async (status) => {
    const deps = fakeDeps({
      files: { [AUTH_FILE]: authFile({ access_token: "access-token-abc", refresh_token: "refresh-secret" }) },
      routes: [usageRoute({ error: { code: "token_expired" } }, status)],
    });

    const error = await fetchCodexUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "auth",
      hint: "Run `codex` in a terminal to refresh your login",
    });
    expect(JSON.stringify(error)).not.toContain("access-token-abc");
    // A refresh would rotate the CLI's refresh token, so the only request is the usage call.
    expect(deps.requests).toHaveLength(1);
  });

  it("throws a parse error when the usage response has no usable data", async () => {
    const deps = fakeDeps({
      files: { [AUTH_FILE]: authFile({ access_token: "access-token-abc" }) },
      routes: [usageRoute({ plan_type: "plus" })],
    });

    await expect(fetchCodexUsage(deps, NO_SETTINGS)).rejects.toMatchObject({ kind: "parse" });
  });
});
