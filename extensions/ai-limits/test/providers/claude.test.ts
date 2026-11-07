import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fakeDeps, FakeProgram, HOME, NOW, Route } from "../fake-deps";
import { extractSessionKey, fetchClaudeUsage, parseClaudeUsage } from "../../src/lib/providers/claude";
import { ProviderError, Settings } from "../../src/lib/types";

const CREDENTIALS = `${HOME}/.claude/.credentials.json`;
const EXPIRED = NOW - 1_000;
const SESSION_KEY = "sk-ant-sid01-abcDEF123";

const USAGE_JSON = {
  five_hour: { utilization: 37.0, resets_at: "2026-10-14T15:00:00.000000+00:00" },
  seven_day: { utilization: 62.5, resets_at: "2026-10-20T00:00:00.000000+00:00" },
  seven_day_opus: null,
  seven_day_sonnet: { utilization: 12, resets_at: "2026-10-20T00:00:00.000000+00:00" },
  limits: [
    {
      kind: "weekly_model",
      group: "models",
      percent: 8,
      resets_at: "2026-10-20T00:00:00.000000+00:00",
      is_active: true,
      scope: { model: { id: "fable", display_name: "Fable" } },
    },
  ],
  extra_usage: { is_enabled: true, monthly_limit: 5000, used_credits: 1234, currency: "USD" },
};

const ORGANIZATIONS_JSON = [
  { uuid: "org-team", name: "Acme Team", capabilities: ["team"] },
  {
    uuid: "org-personal",
    name: "omar@example.com",
    capabilities: ["chat", "claude_max"],
    rate_limit_tier: "default_claude_max_5x",
  },
];

function oauthCredentials(oauth: Record<string, unknown>): string {
  return JSON.stringify({
    claudeAiOauth: { accessToken: "oauth-token-123", scopes: ["user:inference", "user:profile"], ...oauth },
  });
}

function oauthRoute(body: unknown, status = 200): Route {
  return { prefix: "https://api.anthropic.com/api/oauth/usage", respond: { status, body } };
}

// The usage route comes first because the organizations URL is a prefix of it.
function sessionRoutes(
  options: { organizations?: unknown; organizationsStatus?: number; usage?: unknown; usageStatus?: number } = {},
): Route[] {
  return [
    {
      prefix: "https://claude.ai/api/organizations/",
      respond: { status: options.usageStatus ?? 200, body: options.usage ?? USAGE_JSON },
    },
    {
      prefix: "https://claude.ai/api/organizations",
      respond: { status: options.organizationsStatus ?? 200, body: options.organizations ?? ORGANIZATIONS_JSON },
    },
  ];
}

const NO_SETTINGS: Settings = {};
const WITH_SESSION: Settings = { claudeSessionKey: SESSION_KEY };

describe("parseClaudeUsage", () => {
  it("maps the fixed windows, the per-model limit and extra usage in dollars", () => {
    const usage = parseClaudeUsage(USAGE_JSON);

    expect(usage.windows).toEqual([
      { label: "Session", usedPercent: 37, resetsAt: Date.parse("2026-10-14T15:00:00Z") },
      { label: "Weekly", usedPercent: 62.5, resetsAt: Date.parse("2026-10-20T00:00:00Z") },
      { label: "Weekly (Sonnet)", usedPercent: 12, resetsAt: Date.parse("2026-10-20T00:00:00Z") },
      { label: "Weekly (Fable)", usedPercent: 8, resetsAt: Date.parse("2026-10-20T00:00:00Z") },
    ]);
    expect(usage.balances).toEqual([{ label: "Extra Usage", amount: 12.34, limit: 50, currency: "USD" }]);
  });

  it("clamps utilization above 100 and skips null or non-numeric windows", () => {
    const usage = parseClaudeUsage({
      five_hour: { utilization: 140, resets_at: null },
      seven_day: { utilization: "lots", resets_at: "2026-10-20T00:00:00Z" },
      seven_day_opus: null,
      seven_day_sonnet: { utilization: 0, resets_at: null },
    });

    expect(usage.windows).toEqual([
      { label: "Session", usedPercent: 100, resetsAt: null },
      { label: "Weekly (Sonnet)", usedPercent: 0, resetsAt: null },
    ]);
  });

  it("adds a limit's model window only when no window with that label exists", () => {
    const usage = parseClaudeUsage({
      seven_day_sonnet: { utilization: 12, resets_at: null },
      limits: [
        { percent: 40, scope: { model: { display_name: "Sonnet" } } },
        { percent: 5, scope: { model: { display_name: "Fable" } } },
        { percent: 9, scope: { model: {} } },
        { percent: 7, kind: "session" },
      ],
    });

    expect(usage.windows.map((window) => window.label)).toEqual(["Weekly (Sonnet)", "Weekly (Fable)"]);
    expect(usage.windows[1].usedPercent).toBe(5);
  });

  it("leaves out extra usage that is disabled or has no monthly limit", () => {
    expect(
      parseClaudeUsage({ ...USAGE_JSON, extra_usage: { ...USAGE_JSON.extra_usage, is_enabled: false } }).balances,
    ).toEqual([]);
    expect(parseClaudeUsage({ ...USAGE_JSON, extra_usage: { is_enabled: true, monthly_limit: 0 } }).balances).toEqual(
      [],
    );
  });

  it("defaults the extra usage currency to USD", () => {
    const usage = parseClaudeUsage({ extra_usage: { is_enabled: true, monthly_limit: 2000, used_credits: 0 } });

    expect(usage.balances).toEqual([{ label: "Extra Usage", amount: 0, limit: 20, currency: "USD" }]);
  });

  it("throws a parse error when nothing usable came back", () => {
    expect(() => parseClaudeUsage({ five_hour: null, extra_usage: { is_enabled: false } })).toThrow(
      new ProviderError("parse", "Claude returned no usage data"),
    );
    expect(() => parseClaudeUsage("not an object")).toThrow(ProviderError);
  });
});

describe("extractSessionKey", () => {
  it.each([
    ["sk-ant-sid01-abcDEF123", "sk-ant-sid01-abcDEF123"],
    ["  sessionKey=sk-ant-sid01-abcDEF123  ", "sk-ant-sid01-abcDEF123"],
    ["sessionKey=sk-ant-sid01-abcDEF123;", "sk-ant-sid01-abcDEF123"],
    ["Cookie: sessionKey=sk-ant-sid01-abcDEF123; lastActiveOrg=org-1", "sk-ant-sid01-abcDEF123"],
    ["_ga=1; sessionKey=sk-ant-sid01-abcDEF123", "sk-ant-sid01-abcDEF123"],
  ])("reads the key from %j", (raw, expected) => {
    expect(extractSessionKey(raw)).toBe(expected);
  });

  it.each([undefined, "", "   "])("treats %j as no key", (raw) => {
    expect(extractSessionKey(raw)).toBeUndefined();
  });
});

describe("fetchClaudeUsage with the Claude Code credentials file", () => {
  it("reads the OAuth usage endpoint and maps the Max 20x plan", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ subscriptionType: "max", rateLimitTier: "default_claude_max_20x" }) },
      routes: [oauthRoute(USAGE_JSON)],
    });

    const usage = await fetchClaudeUsage(deps, NO_SETTINGS);

    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0]).toMatchObject({
      url: "https://api.anthropic.com/api/oauth/usage",
      method: "GET",
    });
    expect(deps.requests[0].headers).toMatchObject({
      authorization: "Bearer oauth-token-123",
      "anthropic-beta": "oauth-2025-04-20",
      "user-agent": "AI-Limits-Raycast",
    });
    expect(usage.provider).toBe("claude");
    expect(usage.plan).toBe("Max 20x");
    expect(usage.account).toBeUndefined();
    expect(usage.source).toBe("Claude Code credentials");
    expect(usage.fetchedAt).toBe(NOW);
    expect(usage.notes).toEqual([]);
    expect(usage.windows.map((window) => [window.label, window.usedPercent])).toEqual([
      ["Session", 37],
      ["Weekly", 62.5],
      ["Weekly (Sonnet)", 12],
      ["Weekly (Fable)", 8],
    ]);
    expect(usage.balances).toEqual([{ label: "Extra Usage", amount: 12.34, limit: 50, currency: "USD" }]);
  });

  it.each([
    ["pro", undefined, "Pro"],
    ["team", undefined, "Team"],
    ["enterprise", undefined, "Enterprise"],
    ["max", "default_claude_max_5x", "Max 5x"],
    ["custom_plan", undefined, "Custom Plan"],
    [undefined, undefined, undefined],
  ])("maps subscriptionType %j and tier %j to %j", async (subscriptionType, rateLimitTier, plan) => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ subscriptionType, rateLimitTier }) },
      routes: [oauthRoute(USAGE_JSON)],
    });

    expect((await fetchClaudeUsage(deps, NO_SETTINGS)).plan).toBe(plan);
  });

  it("uses CLAUDE_CONFIG_DIR instead of the default folder when it is set", async () => {
    const deps = fakeDeps({
      files: { "/Volumes/work/claude/.credentials.json": oauthCredentials({}) },
      routes: [oauthRoute(USAGE_JSON)],
    });
    deps.env.CLAUDE_CONFIG_DIR = "/Volumes/work/claude";

    await fetchClaudeUsage(deps, NO_SETTINGS);

    expect(deps.requests).toHaveLength(1);
  });

  it("reads the credentials file from the folder in settings before CLAUDE_CONFIG_DIR", async () => {
    const deps = fakeDeps({
      files: { "/Volumes/shell/claude/.credentials.json": oauthCredentials({}) },
      routes: [oauthRoute(USAGE_JSON)],
    });
    deps.env.CLAUDE_CONFIG_DIR = "/Volumes/work/claude";

    await fetchClaudeUsage(deps, { claudeConfigDir: "/Volumes/shell/claude" });

    expect(deps.requests).toHaveLength(1);
  });

  it("accepts a login with no scopes field and one with an empty scopes list", async () => {
    const withoutScopes = fakeDeps({
      files: { [CREDENTIALS]: JSON.stringify({ claudeAiOauth: { accessToken: "oauth-token-123" } }) },
      routes: [oauthRoute(USAGE_JSON)],
    });
    const emptyScopes = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ scopes: [] }) },
      routes: [oauthRoute(USAGE_JSON)],
    });

    expect((await fetchClaudeUsage(withoutScopes, NO_SETTINGS)).source).toBe("Claude Code credentials");
    expect((await fetchClaudeUsage(emptyScopes, NO_SETTINGS)).source).toBe("Claude Code credentials");
  });

  it("does not use a token that expires within the next minute and never refreshes it", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ expiresAt: NOW + 30_000, refreshToken: "rt-secret" }) },
      routes: [oauthRoute(USAGE_JSON)],
    });

    await expect(fetchClaudeUsage(deps, NO_SETTINGS)).rejects.toMatchObject({
      kind: "auth",
      message: "Claude Code token expired",
      hint: expect.stringContaining("Open Claude Code to refresh its login"),
    });
    expect(deps.requests).toEqual([]);
  });

  it("falls back to the session key with a note when the token is expired", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ expiresAt: EXPIRED }) },
      routes: [oauthRoute(USAGE_JSON), ...sessionRoutes()],
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(deps.requests.map((request) => request.url)).not.toContainEqual(
      expect.stringContaining("api.anthropic.com"),
    );
    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual(["Claude Code token expired, used claude.ai session"]);
    expect(usage.keychainDenied).toBeUndefined();
  });

  it("throws an auth error with a hint when the token is expired and there is no session key", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ expiresAt: EXPIRED }) },
    });

    const error = await fetchClaudeUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("auth");
    expect((error as ProviderError).hint).toContain("claude.ai session key");
  });

  it("falls back to the session key when the API rejects the OAuth token with 401", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [oauthRoute({ error: "invalid_token" }, 401), ...sessionRoutes()],
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual(["Claude Code token was rejected, used claude.ai session"]);
  });

  it.each([
    [429, "HTTP 429"],
    [503, "HTTP 503"],
  ])("falls back to the session key when the OAuth call answers %i", async (status, reason) => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [oauthRoute({ error: "busy" }, status), ...sessionRoutes()],
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual([`Claude Code token couldn't be used (${reason}), used claude.ai session`]);
  });

  it("falls back to the session key on a network failure, with a short note", async () => {
    // No route answers the OAuth host, so the fake fetch fails the way a dropped connection does.
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: sessionRoutes() });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(usage.notes).toEqual(["Claude Code token couldn't be used (network error), used claude.ai session"]);
  });

  it("does not fall back when the OAuth answer is not a usable usage body", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [oauthRoute({ unexpected: true }), ...sessionRoutes()],
    });

    await expect(fetchClaudeUsage(deps, WITH_SESSION)).rejects.toMatchObject({ kind: "parse" });
    expect(deps.requests.map((request) => request.url)).not.toContainEqual(expect.stringContaining("claude.ai"));
  });

  it("names the session in the error when the fallback session also fails", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [oauthRoute({ error: "busy" }, 429), ...sessionRoutes({ organizationsStatus: 401, organizations: {} })],
    });

    const error = await fetchClaudeUsage(deps, WITH_SESSION).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "auth",
      message: "claude.ai session failed: Claude rejected the credentials (HTTP 401)",
      hint: expect.stringContaining("Use Claude Session Key"),
    });
  });

  it("throws an auth error with the Claude Code hint on 403 when there is no session key", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [oauthRoute({ error: "forbidden" }, 403)],
    });

    const error = await fetchClaudeUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "auth", hint: expect.stringContaining("Open Claude Code") });
  });

  it("reports when Claude allows the next request after a 429 when there is no session key", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({}) },
      routes: [
        {
          prefix: "https://api.anthropic.com/api/oauth/usage",
          respond: { status: 429, headers: { "Retry-After": "60" }, body: {} },
        },
      ],
    });

    const error = await fetchClaudeUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: "http", status: 429, retryAt: NOW + 60_000 });
  });

  it("does not use the session key when the credentials file has no user:profile scope", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ scopes: ["user:inference"] }) },
      routes: [oauthRoute(USAGE_JSON), ...sessionRoutes()],
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(deps.requests.map((request) => request.url)).not.toContainEqual(
      expect.stringContaining("api.anthropic.com"),
    );
    expect(usage.notes).toEqual(["Claude Code login is missing the user:profile scope, used claude.ai session"]);
  });

  it("gives an auth error when the login has no user:profile scope and there is no session key", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({ scopes: ["user:inference"] }) } });

    await expect(fetchClaudeUsage(deps, NO_SETTINGS)).rejects.toMatchObject({
      kind: "auth",
      message: "Claude Code login is missing the user:profile scope",
    });
  });

  it("treats an empty access token as no login", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({ accessToken: "" }) } });

    await expect(fetchClaudeUsage(deps, NO_SETTINGS)).rejects.toMatchObject({ kind: "not-connected" });
  });

  it("throws a parse error for a credentials file that is not JSON when there is no session key", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: "{ not json" } });

    const error = await fetchClaudeUsage(deps, NO_SETTINGS).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "parse" });
    expect((error as ProviderError).hint).toBe(
      "Sign in to Claude Code again, or add your claude.ai session key in the extension preferences",
    );
  });

  it("uses the session key when the credentials file is not JSON", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: "{ not json" },
      routes: sessionRoutes(),
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual([]);
  });
});

describe("fetchClaudeUsage with the claude.ai session key", () => {
  it("picks the chat organization, sends the cookie and maps the plan and account", async () => {
    const deps = fakeDeps({ routes: sessionRoutes() });

    const usage = await fetchClaudeUsage(deps, { claudeSessionKey: `sessionKey=${SESSION_KEY};` });

    expect(deps.requests.map((request) => request.url)).toEqual([
      "https://claude.ai/api/organizations",
      "https://claude.ai/api/organizations/org-personal/usage",
    ]);
    for (const request of deps.requests) {
      expect(request.headers).toMatchObject({
        cookie: `sessionKey=${SESSION_KEY}`,
        "user-agent": "AI-Limits-Raycast",
      });
      expect(request.headers.authorization).toBeUndefined();
    }
    expect(usage).toMatchObject({
      provider: "claude",
      plan: "Max 5x",
      account: "omar@example.com",
      source: "claude.ai session",
      notes: [],
      fetchedAt: NOW,
    });
    expect(usage.windows).toHaveLength(4);
    expect(usage.balances).toEqual([{ label: "Extra Usage", amount: 12.34, limit: 50, currency: "USD" }]);
  });

  it("uses the first organization when none has the chat capability", async () => {
    const deps = fakeDeps({
      routes: sessionRoutes({
        organizations: [
          { uuid: "org-a", name: "Alpha", capabilities: ["team"] },
          { uuid: "org-b", name: "Beta", capabilities: ["api"] },
        ],
      }),
    });

    const usage = await fetchClaudeUsage(deps, WITH_SESSION);

    expect(deps.requests[1].url).toBe("https://claude.ai/api/organizations/org-a/usage");
    expect(usage.account).toBe("Alpha");
    expect(usage.plan).toBeUndefined();
  });

  it.each([
    [["chat", "claude_pro"], "Pro"],
    [["chat", "claude_max"], "Max"],
    [["chat"], undefined],
  ])("maps capabilities %j to plan %j", async (capabilities, plan) => {
    const deps = fakeDeps({
      routes: sessionRoutes({ organizations: [{ uuid: "org-1", name: "Me", capabilities }] }),
    });

    expect((await fetchClaudeUsage(deps, WITH_SESSION)).plan).toBe(plan);
  });

  it("throws a parse error when the account has no organizations", async () => {
    const deps = fakeDeps({ routes: sessionRoutes({ organizations: [] }) });

    await expect(fetchClaudeUsage(deps, WITH_SESSION)).rejects.toMatchObject({ kind: "parse" });
  });

  it("throws an auth error with the session hint when the session key is rejected", async () => {
    const deps = fakeDeps({
      routes: sessionRoutes({ organizations: { error: "unauthorized" }, organizationsStatus: 401 }),
    });

    const error = await fetchClaudeUsage(deps, WITH_SESSION).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "auth", hint: expect.stringContaining("Use Claude Session Key") });
    expect(JSON.stringify(error)).not.toContain(SESSION_KEY);
  });

  it("names the Claude Session Key preference in the hint when the session key came from there", async () => {
    const deps = fakeDeps({
      routes: sessionRoutes({ organizations: { error: "unauthorized" }, organizationsStatus: 401 }),
    });

    const error = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeSessionKeySource: "preference" }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      kind: "auth",
      hint: "Paste a fresh sessionKey cookie into the Claude Session Key preference",
    });
  });

  it("keeps the Use Claude Session Key hint when the session key was saved by Connect", async () => {
    const deps = fakeDeps({
      routes: sessionRoutes({ organizations: { error: "unauthorized" }, organizationsStatus: 401 }),
    });

    const error = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeSessionKeySource: "connection" }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ kind: "auth", hint: expect.stringContaining("Use Claude Session Key") });
  });

  it("throws an auth error when the usage request is rejected", async () => {
    const deps = fakeDeps({ routes: sessionRoutes({ usage: { error: "forbidden" }, usageStatus: 403 }) });

    await expect(fetchClaudeUsage(deps, WITH_SESSION)).rejects.toMatchObject({ kind: "auth" });
  });

  it("is not-connected when neither source is set", async () => {
    const deps = fakeDeps();

    const error = await fetchClaudeUsage(deps, { claudeSessionKey: "   " }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: "not-connected", message: "No Claude login found" });
    expect((error as ProviderError).hint).toContain("Connect Claude Code");
    expect((error as ProviderError).hint).toContain("Use Claude Session Key");
    expect(deps.requests).toEqual([]);
  });
});

const SECURITY = "/usr/bin/security";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const KEYCHAIN: Settings = { claudeKeychain: true };
const KEYCHAIN_READ_ARGS = ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"];
const KEYCHAIN_DENIED_NOTE = "macOS denied access to Claude Code's Keychain login, used claude.ai session";

// Answers the `security` call that reads Claude Code's Keychain item.
function keychainAnswer(exitCode: number, stdout = ""): FakeProgram {
  return { file: SECURITY, respond: { exitCode, stdout, stderr: "" } };
}

describe("fetchClaudeUsage with the Claude Code Keychain login", () => {
  it("reads the default Keychain item and labels the usage with its source", async () => {
    const deps = fakeDeps({ routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(
      keychainAnswer(0, `${oauthCredentials({ subscriptionType: "max", rateLimitTier: "default_claude_max_20x" })}\n`),
    );

    const usage = await fetchClaudeUsage(deps, KEYCHAIN);

    expect(deps.runCalls).toEqual([{ file: SECURITY, args: KEYCHAIN_READ_ARGS, options: { timeoutMs: 60_000 } }]);
    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0].headers.authorization).toBe("Bearer oauth-token-123");
    expect(usage).toMatchObject({ plan: "Max 20x", source: "Claude Code (Keychain)", notes: [] });
  });

  it("prefers the Keychain login over a stale credentials file", async () => {
    const deps = fakeDeps({
      files: { [CREDENTIALS]: oauthCredentials({ accessToken: "stale-file-token" }) },
      routes: [oauthRoute(USAGE_JSON)],
    });
    deps.programs.push(keychainAnswer(0, `${oauthCredentials({})}\n`));

    await fetchClaudeUsage(deps, KEYCHAIN);

    expect(deps.requests[0].headers.authorization).toBe("Bearer oauth-token-123");
  });

  it("falls back to the credentials file when the Keychain has no item", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(44));

    const usage = await fetchClaudeUsage(deps, KEYCHAIN);

    expect(deps.runCalls).toHaveLength(1);
    expect(deps.requests).toHaveLength(1);
    expect(usage.source).toBe("Claude Code credentials");
  });

  it("falls back to the credentials file when the Keychain item has no login in it", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(0, `${JSON.stringify({ claudeAiOauth: { accessToken: "" } })}\n`));

    const usage = await fetchClaudeUsage(deps, KEYCHAIN);

    expect(usage.source).toBe("Claude Code credentials");
  });

  it("reads only the credentials file on a platform without a Keychain", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.platform = "linux";

    const usage = await fetchClaudeUsage(deps, KEYCHAIN);

    expect(deps.runCalls).toEqual([]);
    expect(usage.source).toBe("Claude Code credentials");
  });

  it("never runs security when the Keychain setting is off", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(0, `${oauthCredentials({ accessToken: "keychain-token" })}\n`));

    const usage = await fetchClaudeUsage(deps, NO_SETTINGS);

    expect(deps.runCalls).toEqual([]);
    expect(deps.requests[0].headers.authorization).toBe("Bearer oauth-token-123");
    expect(usage.source).toBe("Claude Code credentials");
  });

  it("does not touch the Keychain when the setting is off and nothing else is connected", async () => {
    const deps = fakeDeps();

    await expect(fetchClaudeUsage(deps, NO_SETTINGS)).rejects.toMatchObject({ kind: "not-connected" });
    expect(deps.runCalls).toEqual([]);
  });

  it("looks up the Keychain item for CLAUDE_CONFIG_DIR by its hashed name", async () => {
    const deps = fakeDeps({ routes: [oauthRoute(USAGE_JSON)] });
    deps.env.CLAUDE_CONFIG_DIR = "/Volumes/work/claude";
    deps.programs.push(keychainAnswer(0, `${oauthCredentials({})}\n`));

    await fetchClaudeUsage(deps, KEYCHAIN);

    const hash = createHash("sha256").update("/Volumes/work/claude").digest("hex").slice(0, 8);
    expect(deps.runCalls[0].args).toEqual(["find-generic-password", "-s", `Claude Code-credentials-${hash}`, "-w"]);
  });

  it("looks up the Keychain item for the folder in settings before CLAUDE_CONFIG_DIR", async () => {
    const deps = fakeDeps({ routes: [oauthRoute(USAGE_JSON)] });
    deps.env.CLAUDE_CONFIG_DIR = "/Volumes/work/claude";
    deps.programs.push(keychainAnswer(0, `${oauthCredentials({})}\n`));

    await fetchClaudeUsage(deps, { ...KEYCHAIN, claudeConfigDir: "/Volumes/shell/claude" });

    const hash = createHash("sha256").update("/Volumes/shell/claude").digest("hex").slice(0, 8);
    expect(deps.runCalls[0].args).toEqual(["find-generic-password", "-s", `Claude Code-credentials-${hash}`, "-w"]);
  });

  it("decodes a Keychain password that security printed as hex", async () => {
    const deps = fakeDeps({ routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(0, `${Buffer.from(oauthCredentials({})).toString("hex")}\n`));

    const usage = await fetchClaudeUsage(deps, KEYCHAIN);

    expect(usage.source).toBe("Claude Code (Keychain)");
    expect(deps.requests[0].headers.authorization).toBe("Bearer oauth-token-123");
  });

  it("does not fall back to the credentials file for a Keychain item that is not JSON", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(0, "{ not json\n"));

    const error = await fetchClaudeUsage(deps, KEYCHAIN).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "parse", message: "Claude Code's Keychain login isn't valid JSON" });
    expect(deps.requests).toEqual([]);
  });

  it("throws an auth error telling the user to allow access when macOS denies the Keychain read", async () => {
    const deps = fakeDeps({ files: { [CREDENTIALS]: oauthCredentials({}) }, routes: [oauthRoute(USAGE_JSON)] });
    deps.programs.push(keychainAnswer(128));

    const error = await fetchClaudeUsage(deps, KEYCHAIN).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "auth",
      message: "macOS denied access to Claude Code's login in the Keychain",
      hint: expect.stringContaining("Always Allow"),
    });
    expect((error as ProviderError).hint).toContain("Connect Claude Code");
    expect((error as ProviderError).code).toBe("keychain-denied");
    // The file is not used even though it holds a login, because it may be the stale copy.
    expect(deps.requests).toEqual([]);
  });

  it("falls back to the session key with a note when the Keychain read is denied", async () => {
    const deps = fakeDeps({ routes: sessionRoutes() });
    deps.programs.push(keychainAnswer(128));

    const usage = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeKeychain: true });

    expect(deps.requests.map((request) => request.url)).not.toContainEqual(
      expect.stringContaining("api.anthropic.com"),
    );
    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual([KEYCHAIN_DENIED_NOTE]);
    // The denial is reported, so the UI turns the Keychain setting off instead of asking macOS on every refresh.
    expect(usage.keychainDenied).toBe(true);
  });

  it("carries the keychain-denied code when the session also fails after a denied Keychain read", async () => {
    const deps = fakeDeps({ routes: sessionRoutes({ organizationsStatus: 401, organizations: {} }) });
    deps.programs.push(keychainAnswer(128));

    const error = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeKeychain: true }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      kind: "auth",
      message: "claude.ai session failed: Claude rejected the credentials (HTTP 401)",
      code: "keychain-denied",
    });
  });

  it("treats a security run that can't start or times out as denied", async () => {
    const deps = fakeDeps({ routes: sessionRoutes() });
    deps.programs.push({
      file: SECURITY,
      respond: () => {
        throw new Error("security timed out");
      },
    });

    const usage = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeKeychain: true });

    expect(usage.notes).toEqual([KEYCHAIN_DENIED_NOTE]);
  });

  it("falls back to the session key when the Keychain token is expired", async () => {
    const deps = fakeDeps({ routes: [oauthRoute(USAGE_JSON), ...sessionRoutes()] });
    deps.programs.push(keychainAnswer(0, `${oauthCredentials({ expiresAt: EXPIRED })}\n`));

    const usage = await fetchClaudeUsage(deps, { ...WITH_SESSION, claudeKeychain: true });

    expect(deps.requests.map((request) => request.url)).not.toContainEqual(
      expect.stringContaining("api.anthropic.com"),
    );
    expect(usage.source).toBe("claude.ai session");
    expect(usage.notes).toEqual(["Claude Code token expired, used claude.ai session"]);
    expect(usage.keychainDenied).toBeUndefined();
  });

  it("is not-connected with the Connect hint when the setting is on and no login exists", async () => {
    const deps = fakeDeps();
    deps.programs.push(keychainAnswer(44));

    const error = await fetchClaudeUsage(deps, KEYCHAIN).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ kind: "not-connected", message: "Claude Code isn't signed in on this Mac" });
    expect((error as ProviderError).hint).toContain("Connect Claude Code");
    expect(deps.requests).toEqual([]);
  });
});
