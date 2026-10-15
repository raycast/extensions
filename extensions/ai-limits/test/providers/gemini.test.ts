import { describe, expect, it } from "vitest";
import { fetchGeminiUsage, parseGeminiQuota } from "../../src/lib/providers/gemini";
import { ProviderError } from "../../src/lib/types";
import { fakeDeps, fakeJwt, FakeDeps, FakeResponse, HOME, NOW, Route } from "../fake-deps";

const GEMINI_DIR = `${HOME}/.gemini`;
const SETTINGS_PATH = `${GEMINI_DIR}/settings.json`;
const CREDS_PATH = `${GEMINI_DIR}/oauth_creds.json`;
const CODE_ASSIST = "https://cloudcode-pa.googleapis.com/v1internal";
const LOAD_URL = `${CODE_ASSIST}:loadCodeAssist`;
const QUOTA_URL = `${CODE_ASSIST}:retrieveUserQuota`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const RESET_ISO = "2026-10-15T00:00:00Z";
const RESET_MS = Date.parse(RESET_ISO);
const ONE_HOUR_MS = 3_600_000;

const ID_TOKEN = fakeJwt({ email: "me@example.com", sub: "1234" });
const WORKSPACE_ID_TOKEN = fakeJwt({ email: "me@acme.com", hd: "acme.com" });

const STANDARD_ASSIST = {
  currentTier: { id: "standard-tier", name: "Gemini Code Assist" },
  paidTier: { id: "g1-pro-tier", name: "Google AI Pro" },
  cloudaicompanionProject: "my-proj-123",
};

const PRO_FLASH_QUOTA = {
  buckets: [
    { modelId: "gemini-2.5-pro", remainingFraction: 0.8, resetTime: RESET_ISO, tokenType: "REQUESTS" },
    { modelId: "gemini-2.5-flash", remainingFraction: 0.5, resetTime: RESET_ISO, tokenType: "REQUESTS" },
    { modelId: "gemini-2.5-flash-lite", remainingFraction: 0.9, resetTime: RESET_ISO, tokenType: "REQUESTS" },
  ],
};

interface CredsOverrides {
  access_token?: string;
  refresh_token?: string | null;
  id_token?: string | null;
  expiry_date?: number | null;
}

// The CLI's oauth_creds.json. A null override drops the field, so tests can describe partial files.
function credsFile(overrides: CredsOverrides = {}): string {
  const base: Record<string, unknown> = {
    access_token: "access-1",
    refresh_token: "refresh-1",
    id_token: ID_TOKEN,
    expiry_date: NOW + ONE_HOUR_MS,
    token_type: "Bearer",
    scope: "openid email profile",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) {
      delete base[key];
    } else {
      base[key] = value;
    }
  }
  return JSON.stringify(base);
}

interface RouteOptions {
  assist?: FakeResponse;
  quota?: FakeResponse;
  token?: FakeResponse;
}

function geminiRoutes(options: RouteOptions = {}): Route[] {
  return [
    { prefix: LOAD_URL, method: "POST", respond: options.assist ?? { body: STANDARD_ASSIST } },
    { prefix: QUOTA_URL, method: "POST", respond: options.quota ?? { body: PRO_FLASH_QUOTA } },
    { prefix: TOKEN_URL, method: "POST", respond: options.token ?? { body: { access_token: "fresh-access" } } },
  ];
}

function jsonBody(deps: FakeDeps, index: number): Record<string, unknown> {
  return JSON.parse(deps.requests[index].body ?? "{}");
}

describe("parseGeminiQuota", () => {
  it("groups models into Pro, Flash and Flash Lite, then the rest alphabetically", () => {
    const windows = parseGeminiQuota({
      buckets: [
        { modelId: "gemma-3-27b", remainingFraction: 0.25, resetTime: RESET_ISO },
        { modelId: "gemini-2.5-flash-lite", remainingFraction: 0.9, resetTime: RESET_ISO },
        { modelId: "gemini-embedding-001", remainingFraction: 1, resetTime: RESET_ISO },
        { modelId: "gemini-2.5-flash", remainingFraction: 0.5, resetTime: RESET_ISO },
        { modelId: "gemini-2.5-pro", remainingFraction: 0.8, resetTime: RESET_ISO },
      ],
    });

    expect(windows.map((w) => w.label)).toEqual(["Pro", "Flash", "Flash Lite", "gemini-embedding-001", "gemma-3-27b"]);
    expect(windows[0].usedPercent).toBeCloseTo(20);
    expect(windows[1].usedPercent).toBeCloseTo(50);
    expect(windows[2].usedPercent).toBeCloseTo(10);
    expect(windows[4].usedPercent).toBeCloseTo(75);
    expect(windows[0].resetsAt).toBe(RESET_MS);
  });

  it("keeps the lowest remaining fraction when a model has several buckets", () => {
    const windows = parseGeminiQuota({
      buckets: [
        { modelId: "gemini-2.5-pro", remainingFraction: 0.8, resetTime: RESET_ISO, tokenType: "REQUESTS" },
        { modelId: "gemini-2.5-pro", remainingFraction: 0.3, resetTime: RESET_ISO, tokenType: "INPUT_TOKENS" },
      ],
    });
    expect(windows).toHaveLength(1);
    expect(windows[0].usedPercent).toBeCloseTo(70);
  });

  it("shows the most-used model of a family, with its reset time", () => {
    const windows = parseGeminiQuota({
      buckets: [
        { modelId: "gemini-2.5-pro", remainingFraction: 0.8, resetTime: "2026-10-15T00:00:00Z" },
        { modelId: "gemini-3-pro-preview", remainingFraction: 0.6, resetTime: "2026-10-16T00:00:00Z" },
      ],
    });
    expect(windows).toHaveLength(1);
    expect(windows[0].usedPercent).toBeCloseTo(40);
    expect(windows[0]).toMatchObject({
      label: "Pro",
      resetsAt: Date.parse("2026-10-16T00:00:00Z"),
      detail: "gemini-3-pro-preview",
    });
  });

  it("does not count flash-lite as Flash", () => {
    const windows = parseGeminiQuota({
      buckets: [{ modelId: "gemini-2.5-flash-lite", remainingFraction: 0.9, resetTime: RESET_ISO }],
    });
    expect(windows.map((w) => w.label)).toEqual(["Flash Lite"]);
  });

  it("clamps the used percent and leaves the reset null when the bucket has none", () => {
    const windows = parseGeminiQuota({
      buckets: [{ modelId: "gemini-2.5-pro", remainingFraction: 1.5 }],
    });
    expect(windows).toEqual([{ label: "Pro", usedPercent: 0, resetsAt: null, detail: "gemini-2.5-pro" }]);
  });

  it("skips buckets without a model or a numeric fraction", () => {
    const windows = parseGeminiQuota({
      buckets: [
        { remainingFraction: 0.5 },
        { modelId: "gemini-2.5-pro", remainingFraction: "lots" },
        { modelId: "gemini-2.5-flash", remainingFraction: "0.4" },
        "junk",
      ],
    });
    expect(windows.map((w) => w.label)).toEqual(["Flash"]);
    expect(windows[0].usedPercent).toBeCloseTo(60);
  });

  it("throws a parse error when the buckets are empty or missing", () => {
    expect(() => parseGeminiQuota({ buckets: [] })).toThrow(ProviderError);
    expect(() => parseGeminiQuota({})).toThrow(/no usable buckets/);
    expect(() => parseGeminiQuota(null)).toThrow(ProviderError);
  });
});

describe("fetchGeminiUsage happy path", () => {
  it("reads the plan, quota windows and account from a Google login", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: credsFile() }, routes: geminiRoutes() });
    const usage = await fetchGeminiUsage(deps);

    expect(usage).toMatchObject({
      provider: "gemini",
      plan: "Google AI Pro",
      account: "me@example.com",
      source: "Gemini CLI login",
      balances: [],
      notes: [],
      fetchedAt: NOW,
    });
    expect(usage.windows.map((w) => w.label)).toEqual(["Pro", "Flash", "Flash Lite"]);
    expect(usage.windows[0]).toMatchObject({ detail: "gemini-2.5-pro", resetsAt: RESET_MS });
  });

  it("sends the loadCodeAssist and retrieveUserQuota requests with the access token", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: credsFile() }, routes: geminiRoutes() });
    await fetchGeminiUsage(deps);

    expect(deps.requests.map((r) => `${r.method} ${r.url}`)).toEqual([`POST ${LOAD_URL}`, `POST ${QUOTA_URL}`]);
    for (const request of deps.requests) {
      expect(request.headers.authorization).toBe("Bearer access-1");
      expect(request.headers["content-type"]).toBe("application/json");
    }
    expect(jsonBody(deps, 0)).toEqual({
      metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" },
    });
    expect(jsonBody(deps, 1)).toEqual({ project: "my-proj-123" });
  });

  it("does not touch the network or the credentials file when the access token is fresh", async () => {
    const files = { [CREDS_PATH]: credsFile() };
    const deps = fakeDeps({ files, routes: geminiRoutes() });
    await fetchGeminiUsage(deps);

    expect(deps.requests.some((r) => r.url === TOKEN_URL)).toBe(false);
    expect(deps.files.get(CREDS_PATH)).toBe(files[CREDS_PATH]);
  });

  it("uses the token when it has no expiry date", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: credsFile({ expiry_date: null }) }, routes: geminiRoutes() });
    await fetchGeminiUsage(deps);
    expect(deps.requests.some((r) => r.url === TOKEN_URL)).toBe(false);
  });

  it("returns no account when the id token is missing", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: credsFile({ id_token: null }) }, routes: geminiRoutes() });
    const usage = await fetchGeminiUsage(deps);
    expect(usage.account).toBeUndefined();
  });

  it("reads the project as an object with an id", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: { body: { ...STANDARD_ASSIST, cloudaicompanionProject: { id: "proj-obj" } } } }),
    });
    await fetchGeminiUsage(deps);
    expect(jsonBody(deps, 1)).toEqual({ project: "proj-obj" });
  });

  it("sends an empty quota body when the project is unknown", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: { body: { currentTier: { id: "standard-tier" } } } }),
    });
    await fetchGeminiUsage(deps);
    expect(deps.requests[1].body).toBe("{}");
  });
});

describe("fetchGeminiUsage settings and credentials", () => {
  it.each([
    [
      "the newer security.auth.selectedType",
      JSON.stringify({ security: { auth: { selectedType: "gemini-api-key" } } }),
    ],
    ["the older selectedAuthType", JSON.stringify({ selectedAuthType: "vertex-ai" })],
    ["an API key type", JSON.stringify({ security: { auth: { selectedType: "api-key" } } })],
  ])("reports not-connected for an API key setup from %s", async (_label, settingsText) => {
    const deps = fakeDeps({
      files: { [SETTINGS_PATH]: settingsText, [CREDS_PATH]: credsFile() },
      routes: geminiRoutes(),
    });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "not-connected", message: "Gemini CLI uses an API key" });
    expect((error as ProviderError).hint).toContain("Sign in with Google");
    expect(deps.requests).toEqual([]);
  });

  it("keeps going for a Google login type", async () => {
    const deps = fakeDeps({
      files: {
        [SETTINGS_PATH]: JSON.stringify({ security: { auth: { selectedType: "oauth-personal" } } }),
        [CREDS_PATH]: credsFile(),
      },
      routes: geminiRoutes(),
    });
    await expect(fetchGeminiUsage(deps)).resolves.toMatchObject({ plan: "Google AI Pro" });
  });

  it("ignores a settings file that is not valid JSON", async () => {
    const deps = fakeDeps({ files: { [SETTINGS_PATH]: "{ nope", [CREDS_PATH]: credsFile() }, routes: geminiRoutes() });
    await expect(fetchGeminiUsage(deps)).resolves.toMatchObject({ source: "Gemini CLI login" });
  });

  it("reports not-connected with the install hint when there are no credentials", async () => {
    const deps = fakeDeps({ routes: geminiRoutes() });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "not-connected" });
    expect((error as ProviderError).hint).toBe(
      "Choose Connect Gemini CLI from this item's actions.\nOr install Gemini CLI, then run `gemini` to sign in with Google",
    );
    expect(deps.requests).toEqual([]);
  });

  it("reports not-connected when the credentials file is not valid JSON", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: "not json" }, routes: geminiRoutes() });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "not-connected" });
  });

  it("reports not-connected when the credentials file is not an object", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: "[1, 2]" }, routes: geminiRoutes() });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "not-connected" });
  });
});

describe("fetchGeminiUsage token refresh", () => {
  const ENV_CREDS = {
    GEMINI_OAUTH_CLIENT_ID: "env-id.apps.googleusercontent.com",
    GEMINI_OAUTH_CLIENT_SECRET: "env-secret",
  };
  const CLI_OAUTH2 =
    "/opt/homebrew/lib/node_modules/@google/gemini-cli/node_modules/@google/gemini-cli-core/dist/src/code_assist/oauth2.js";

  function cliFile(id: string, secret: string): string {
    return [
      `const OAUTH_CLIENT_ID = '${id}';`,
      `const OAUTH_CLIENT_SECRET = "${secret}";`,
      "export const OAUTH_SCOPE = [];",
    ].join("\n");
  }

  it("refreshes an expired token with the environment's client, in memory only", async () => {
    const originalCreds = credsFile({ expiry_date: NOW - 1000 });
    const deps = fakeDeps({ files: { [CREDS_PATH]: originalCreds }, routes: geminiRoutes() });
    deps.env = { ...ENV_CREDS };
    const usage = await fetchGeminiUsage(deps);

    expect(usage.plan).toBe("Google AI Pro");
    const tokenRequest = deps.requests[0];
    expect(tokenRequest).toMatchObject({ url: TOKEN_URL, method: "POST" });
    expect(tokenRequest.headers["content-type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(tokenRequest.body))).toEqual({
      client_id: "env-id.apps.googleusercontent.com",
      client_secret: "env-secret",
      refresh_token: "refresh-1",
      grant_type: "refresh_token",
    });
    // Both the model list and the quota use the new token.
    expect(deps.requests[1].headers.authorization).toBe("Bearer fresh-access");
    expect(deps.requests[2].headers.authorization).toBe("Bearer fresh-access");
    // The CLI's credentials file is never written.
    expect(deps.files.get(CREDS_PATH)).toBe(originalCreds);
    expect([...deps.files.keys()]).toEqual([CREDS_PATH]);
  });

  it("refreshes a token that expires within a minute", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW + 30_000 }) },
      routes: geminiRoutes(),
    });
    deps.env = { ...ENV_CREDS };
    await fetchGeminiUsage(deps);
    expect(deps.requests[0].url).toBe(TOKEN_URL);
    expect(deps.requests[2].headers.authorization).toBe("Bearer fresh-access");
  });

  it("prefers the environment's client over the installed CLI's", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }), [CLI_OAUTH2]: cliFile("file-id", "file-secret") },
      routes: geminiRoutes(),
    });
    deps.env = { ...ENV_CREDS };
    await fetchGeminiUsage(deps);
    expect(Object.fromEntries(new URLSearchParams(deps.requests[0].body)).client_id).toBe(
      "env-id.apps.googleusercontent.com",
    );
  });

  it("reads the client from the installed CLI when the environment has no client", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }), [CLI_OAUTH2]: cliFile("file-id", "file-secret") },
      routes: geminiRoutes(),
    });
    deps.env = { GEMINI_OAUTH_CLIENT_ID: "only-an-id" };
    await fetchGeminiUsage(deps);

    expect(Object.fromEntries(new URLSearchParams(deps.requests[0].body))).toMatchObject({
      client_id: "file-id",
      client_secret: "file-secret",
    });
  });

  it("finds the client in a later install location when the first has none", async () => {
    const npmGlobal = `${HOME}/.npm-global/lib/node_modules/@google/gemini-cli/dist/src/code_assist/oauth2.js`;
    const deps = fakeDeps({
      files: {
        [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }),
        // Present but without the secret, so the search has to go on.
        [CLI_OAUTH2]: "const OAUTH_CLIENT_ID = 'wrong-place';",
        [npmGlobal]: cliFile("npm-global-id", "npm-global-secret"),
      },
      routes: geminiRoutes(),
    });
    await fetchGeminiUsage(deps);
    expect(Object.fromEntries(new URLSearchParams(deps.requests[0].body)).client_id).toBe("npm-global-id");
  });

  it("finds the client in a bundled install, in a chunk rather than the entry file", async () => {
    const bundle = "/opt/homebrew/lib/node_modules/@google/gemini-cli/bundle";
    const deps = fakeDeps({
      files: {
        [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }),
        [`${bundle}/gemini.js`]: "#!/usr/bin/env node\nconsole.log('gemini');",
        [`${bundle}/chunk-XYZ.js`]: cliFile("bundled-id", "bundled-secret"),
      },
      routes: geminiRoutes(),
    });
    await fetchGeminiUsage(deps);
    expect(Object.fromEntries(new URLSearchParams(deps.requests[0].body))).toMatchObject({
      client_id: "bundled-id",
      client_secret: "bundled-secret",
    });
  });

  it("finds the client in an nvm-installed CLI", async () => {
    const nvmFile = `${HOME}/.nvm/versions/node/v22.11.0/lib/node_modules/@google/gemini-cli/dist/src/code_assist/oauth2.js`;
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }), [nvmFile]: cliFile("nvm-id", "nvm-secret") },
      routes: geminiRoutes(),
    });
    await fetchGeminiUsage(deps);
    expect(Object.fromEntries(new URLSearchParams(deps.requests[0].body)).client_id).toBe("nvm-id");
  });

  it("reports an expired login when no client can be found", async () => {
    const deps = fakeDeps({ files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) }, routes: geminiRoutes() });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "auth", message: "Gemini login expired" });
    expect((error as ProviderError).hint).toBe("Run `gemini` once to refresh your login");
    expect(deps.requests).toEqual([]);
  });

  it("reports an expired login without a refresh token and makes no request", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1, refresh_token: null }) },
      routes: geminiRoutes(),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "auth", message: "Gemini login expired" });
    expect(deps.requests).toEqual([]);
  });

  it("reports an expired login when the token endpoint rejects the refresh", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes({ token: { status: 400, body: { error: "invalid_grant" } } }),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "auth", message: "Gemini login expired" });
    expect(deps.requests.map((r) => r.url)).toEqual([TOKEN_URL]);
  });

  it("reports a parse error when the refresh answer has no access token", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes({ token: { body: { token_type: "Bearer" } } }),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports a parse error when the refresh answer is not JSON", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes({ token: { body: "<html>down</html>" } }),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports an expired login when the token endpoint answers 401", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes({ token: { status: 401, body: {} } }),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "auth", message: "Gemini login expired" });
  });

  it("passes other refresh failures through as http errors, not as an expired login", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes({ token: { status: 503, body: {} } }),
    });
    deps.env = { ...ENV_CREDS };
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "http", status: 503 });
  });

  it("passes a network failure during refresh through as an http error", async () => {
    // No token route, so the fake fetch fails the way an unreachable host does.
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile({ expiry_date: NOW - 1 }) },
      routes: geminiRoutes().filter((route) => route.prefix !== TOKEN_URL),
    });
    deps.env = { ...ENV_CREDS };
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "http" });
    expect((error as ProviderError).message).toContain("Couldn't reach Google");
  });
});

describe("fetchGeminiUsage plan names", () => {
  it.each([
    ["the paid tier name", { ...STANDARD_ASSIST }, undefined, "Google AI Pro"],
    ["standard-tier without a paid tier", { currentTier: { id: "standard-tier", name: "x" } }, undefined, "Paid"],
    ["free-tier on a personal account", { currentTier: { id: "free-tier", name: "x" } }, undefined, "Free"],
    [
      "free-tier on a Workspace domain",
      { currentTier: { id: "free-tier", name: "x" } },
      WORKSPACE_ID_TOKEN,
      "Workspace",
    ],
    ["legacy-tier", { currentTier: { id: "legacy-tier", name: "x" } }, undefined, "Legacy"],
    [
      "an unknown tier falls back to its name",
      { currentTier: { id: "new-tier", name: "New Tier" } },
      undefined,
      "New Tier",
    ],
  ])("maps %s", async (_label, assist, idToken, plan) => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile(idToken ? { id_token: idToken } : {}) },
      routes: geminiRoutes({ assist: { body: assist } }),
    });
    const usage = await fetchGeminiUsage(deps);
    expect(usage.plan).toBe(plan);
  });

  it("leaves the plan out when the response has no tier", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: { body: {} } }),
    });
    const usage = await fetchGeminiUsage(deps);
    expect(usage.plan).toBeUndefined();
  });
});

describe("fetchGeminiUsage errors", () => {
  const CONSUMER_ASSIST = { body: { ineligibleTiers: [{ reasonCode: "UNSUPPORTED_CLIENT" }] } };

  it("explains the retired consumer tier when quota is refused for a personal account", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: CONSUMER_ASSIST, quota: { status: 403, body: { error: "forbidden" } } }),
    });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);

    expect(error).toMatchObject({
      kind: "auth",
      message: "Google no longer serves Gemini CLI quota for personal accounts",
      code: "account-unsupported",
    });
    expect((error as ProviderError).hint).toContain("June 2026");
    expect((error as ProviderError).hint).toContain("Code Assist Standard");
  });

  it("keeps the generic auth error for a 403 when the consumer tier was not flagged", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ quota: { status: 403, body: {} } }),
    });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "auth" });
    expect((error as ProviderError).message).not.toContain("personal accounts");
    expect((error as ProviderError).code).toBeUndefined();
  });

  it("keeps the generic auth error for a 403 when the account has a current tier", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({
        assist: {
          body: { currentTier: { id: "standard-tier" }, ineligibleTiers: [{ reasonCode: "UNSUPPORTED_CLIENT" }] },
        },
        quota: { status: 403, body: {} },
      }),
    });
    const error = await fetchGeminiUsage(deps).catch((e: unknown) => e);
    expect((error as ProviderError).message).not.toContain("personal accounts");
  });

  it("reports an auth error with the re-login hint when quota rejects the token", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ quota: { status: 401, body: {} } }),
    });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({
      kind: "auth",
      hint: "Run `gemini` once to refresh your login",
    });
  });

  it("reports an auth error when loadCodeAssist rejects the token", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: { status: 401, body: {} } }),
    });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "auth" });
    expect(deps.requests).toHaveLength(1);
  });

  it("reports an http error when the quota endpoint fails", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ quota: { status: 500, body: {} } }),
    });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "http" });
  });

  it("reports a parse error when loadCodeAssist is not JSON", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ assist: { body: "<html>" } }),
    });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "parse" });
  });

  it("reports a parse error when the quota has no buckets", async () => {
    const deps = fakeDeps({
      files: { [CREDS_PATH]: credsFile() },
      routes: geminiRoutes({ quota: { body: { buckets: [] } } }),
    });
    await expect(fetchGeminiUsage(deps)).rejects.toMatchObject({ kind: "parse" });
  });
});
