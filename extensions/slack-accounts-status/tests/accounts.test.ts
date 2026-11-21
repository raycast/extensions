import assert from "node:assert/strict";
import { afterAll, beforeAll, beforeEach, vi, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OAuth } from "@raycast/api";
import { createStatusRequest, defaultPresets } from "../src/domain";
import { requiredScopes } from "../src/slack";

const local = new Map<string, string>();
const secure = new Map<string, OAuth.TokenSetOptions>();
const loginNames = new Map<string, string>();
const expired = new Set<string>();
const authorizations: OAuth.AuthorizationRequestOptions[] = [];
let failStorage = false;
let storageWrites = 0;
let failStorageAt = 0;
let failTokenSave = false;
let failTokenRemoval = false;
let directory: string;
let accounts: typeof import("../src/accounts");
let state: typeof import("../src/state");
let nextTeam = "T1";

class FakePKCEClient {
  constructor(private readonly options: OAuth.PKCEClient.Options) {}
  async authorizationRequest(options: OAuth.AuthorizationRequestOptions) {
    authorizations.push(options);
    return {
      codeVerifier: "test-verifier",
      redirectURI: "raycast://oauth?package_name=Extension",
      state: "test-state",
      codeChallenge: "test-challenge",
      clientId: options.clientId,
      toURL: () => "https://slack.com/oauth/v2/authorize",
    };
  }
  async authorize() {
    return { authorizationCode: "test-code" };
  }
  async setTokens(tokens: OAuth.TokenSetOptions) {
    if (failTokenSave) throw new Error("Secure storage unavailable");
    secure.set(this.options.providerId!, tokens);
    loginNames.set(this.options.providerId!, this.options.providerName);
    expired.delete(this.options.providerId!);
  }
  async getTokens() {
    const value = secure.get(this.options.providerId!);
    return value
      ? { ...value, updatedAt: new Date(), isExpired: () => expired.has(this.options.providerId!) }
      : undefined;
  }
  async removeTokens() {
    if (failTokenRemoval) throw new Error("Secure cleanup unavailable");
    secure.delete(this.options.providerId!);
  }
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "slack-status-test-"));
  vi.doMock("@raycast/api", () => ({
    OAuth: { PKCEClient: FakePKCEClient, RedirectMethod: { App: "app" } },
    environment: { supportPath: directory },
    getPreferenceValues: () => ({ slackClientId: "123.456" }),
    LocalStorage: {
      getItem: async (key: string) => local.get(key),
      setItem: async (key: string, value: string) => {
        storageWrites++;
        if (failStorage || storageWrites === failStorageAt) throw new Error("Storage unavailable");
        local.set(key, value);
      },
    },
  }));
  accounts = await import("../src/accounts");
  state = await import("../src/state");
});

beforeEach(() => {
  vi.restoreAllMocks();
  local.clear();
  secure.clear();
  loginNames.clear();
  expired.clear();
  authorizations.length = 0;
  failStorage = false;
  storageWrites = 0;
  failStorageAt = 0;
  failTokenSave = false;
  failTokenRemoval = false;
  nextTeam = "T1";
});
afterAll(async () => {
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

const connectTransport: typeof fetch = async (url, options) => {
  if (String(url).endsWith("/oauth.v2.access")) {
    const body = new URLSearchParams(String(options?.body));
    assert.equal(body.get("client_secret"), null);
    assert.equal(body.get("code_verifier"), "test-verifier");
    assert.equal(body.get("redirect_uri"), "raycast://oauth?package_name=Extension");
    return Response.json({
      ok: true,
      authed_user: {
        token_type: "user",
        access_token: `private-token-${nextTeam}`,
        refresh_token: `private-refresh-${nextTeam}`,
        expires_in: 43200,
        scope: requiredScopes.join(","),
      },
    });
  }
  assert.ok(String(url).endsWith("/auth.test"));
  return Response.json({
    ok: true,
    team_id: nextTeam,
    team: `Workspace ${nextTeam}`,
    user_id: "U1",
    user: "test-user",
  });
};

test("Connect requests only user scopes and stores credentials outside account metadata", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  assert.equal(account.teamId, "T1");
  assert.equal(authorizations[0].scope, "");
  assert.equal(authorizations[0].extraParameters?.user_scope, "users.profile:write,users:write,dnd:write");
  assert.equal(secure.get(account.providerId)?.accessToken, "private-token-T1");
  assert.equal(local.get("accounts-v1")?.includes("private-"), false);
  assert.deepEqual(await state.readAccounts(), [account]);
});

test("Two connected workspaces retain separate secure token stores", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const first = await accounts.connectAccount();
  nextTeam = "T2";
  const second = await accounts.connectAccount();
  assert.notEqual(first.providerId, second.providerId);
  assert.equal(loginNames.get(first.providerId), "Slack · Workspace T1");
  assert.equal(loginNames.get(second.providerId), "Slack · Workspace T2");
  assert.equal(secure.get(first.providerId)?.accessToken, "private-token-T1");
  assert.equal(secure.get(second.providerId)?.accessToken, "private-token-T2");
  assert.deepEqual(
    (await state.readAccounts()).map((account) => account.teamId),
    ["T1", "T2"],
  );
});

test("Reconnect reuses the verified account's secure provider without cleanup or extra token sets", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const first = await accounts.connectAccount();
  failTokenRemoval = true;
  const replacement = await accounts.connectAccount(first);
  assert.equal(authorizations[1].extraParameters?.team, "T1");
  assert.equal(first.providerId, replacement.providerId);
  assert.equal(secure.size, 1);
  assert.equal(secure.has(replacement.providerId), true);
  assert.deepEqual(await state.readAccounts(), [replacement]);
});

test("Reconnect rejects consent for the wrong workspace and preserves the original account", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const first = await accounts.connectAccount();
  nextTeam = "T2";
  await assert.rejects(accounts.connectAccount(first), /Workspace T1/);
  assert.deepEqual(await state.readAccounts(), [first]);
  assert.equal(secure.size, 1);
  assert.equal(secure.has(first.providerId), true);
});

test("A failed initial metadata save does not create invisible credentials", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  failStorage = true;
  await assert.rejects(accounts.connectAccount(), /Storage unavailable/);
  assert.equal(secure.size, 0);
  assert.deepEqual(await state.readAccounts(), []);
});

test("A failed secure token save leaves a recoverable pending connection", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  failTokenSave = true;
  await assert.rejects(accounts.connectAccount(), /Secure storage unavailable/);
  const [pending] = await state.readAccounts();
  assert.equal(pending.state, "connecting");
  assert.equal(secure.size, 0);
  failTokenSave = false;
  const connected = await accounts.connectAccount(pending);
  assert.equal(connected.providerId, pending.providerId);
  assert.equal(connected.state, "ready");
  assert.equal(secure.size, 1);
});

test("Failure to finish connection metadata keeps its credential reachable for disconnect", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  failStorageAt = 2;
  await assert.rejects(accounts.connectAccount(), /Storage unavailable/);
  const [pending] = await state.readAccounts();
  assert.equal(pending.state, "connecting");
  assert.equal(secure.has(pending.providerId), true);
  await accounts.disconnectAccount(pending.id);
  assert.deepEqual(await state.readAccounts(), []);
  assert.equal(secure.size, 0);
});

test("A failed disconnect intent save leaves the existing credentials and ready account intact", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  failStorageAt = storageWrites + 1;
  await assert.rejects(accounts.disconnectAccount(account.id), /Storage unavailable/);
  assert.deepEqual(await state.readAccounts(), [account]);
  assert.equal(secure.has(account.providerId), true);
});

test("A failed disconnect metadata cleanup retains a pending row and can be retried", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  failStorageAt = storageWrites + 2;
  await assert.rejects(accounts.disconnectAccount(account.id), /Storage unavailable/);
  const [pending] = await state.readAccounts();
  assert.equal(pending.state, "disconnecting");
  assert.equal(secure.has(account.providerId), false);
  transport.mockImplementation(async () => {
    assert.fail("Pending disconnect must not write to Slack");
  });
  const results = await accounts.applyToAccounts([account], createStatusRequest(defaultPresets[0], null));
  assert.equal(
    results[0].changes.every((change) => !change.ok && change.error?.includes("Finish connecting or disconnecting")),
    true,
  );
  await accounts.disconnectAccount(account.id);
  assert.deepEqual(await state.readAccounts(), []);
  assert.equal(secure.size, 0);
});

test("A failed secure cleanup remains visible and tracked until disconnect succeeds", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  failTokenRemoval = true;
  await assert.rejects(accounts.disconnectAccount(account.id), /Secure cleanup unavailable/);
  assert.equal((await state.readAccounts())[0].state, "disconnecting");
  assert.equal(secure.has(account.providerId), true);
  failTokenRemoval = false;
  await accounts.disconnectAccount(account.id);
  assert.deepEqual(await state.readAccounts(), []);
  assert.equal(secure.size, 0);
});

test("Existing account metadata without a lifecycle field remains usable", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  const { state: _state, ...legacy } = account;
  local.set("accounts-v1", JSON.stringify([legacy]));
  assert.deepEqual(await state.readAccounts(), [account]);
});

test("Disconnect removes only the selected local connection without changing Slack", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const first = await accounts.connectAccount();
  nextTeam = "T2";
  const second = await accounts.connectAccount();
  const requestsBefore = transport.mock.calls.length;
  await accounts.disconnectAccount(first.id);
  assert.deepEqual(await state.readAccounts(), [second]);
  assert.equal(secure.has(first.providerId), false);
  assert.equal(secure.has(second.providerId), true);
  assert.equal(transport.mock.calls.length, requestsBefore);
});

test("Apply touches only selected workspaces and uses each one's own token", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const first = await accounts.connectAccount();
  nextTeam = "T2";
  await accounts.connectAccount();
  const mutations: string[] = [];
  transport.mockImplementation(async (_url, options) => {
    assert.deepEqual(options?.headers, {
      Authorization: "Bearer private-token-T1",
      "Content-Type": "application/json; charset=utf-8",
    });
    mutations.push(String(options?.body));
    return Response.json({ ok: true });
  });
  const results = await accounts.applyToAccounts([first], createStatusRequest(defaultPresets[0], null));
  assert.equal(results.length, 1);
  assert.equal(
    results[0].changes.every((change) => change.ok),
    true,
  );
  assert.equal(mutations.length, 2);
  assert.match(mutations[0], /Focusing/);
  assert.deepEqual(JSON.parse(mutations[1]), { num_minutes: 60 });
});

test("Concurrent commands serialize token rotation so a single-use refresh token is exchanged once", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  expired.add(account.providerId);
  let refreshes = 0;
  transport.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/oauth.v2.access")) {
      refreshes++;
      assert.equal(new URLSearchParams(String(options?.body)).get("refresh_token"), "private-refresh-T1");
      return Response.json({
        ok: true,
        token_type: "user",
        access_token: "rotated-user-token",
        refresh_token: "rotated-refresh-token",
        scope: requiredScopes.join(","),
        expires_in: 43200,
      });
    }
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer rotated-user-token");
    return Response.json({ ok: true });
  });
  const request = createStatusRequest(defaultPresets[0], null);
  const results = await Promise.all([
    accounts.applyToAccounts([account], request),
    accounts.applyToAccounts([account], request),
  ]);
  assert.equal(refreshes, 1);
  assert.equal(
    results.flat().every((result) => result.changes.every((change) => change.ok)),
    true,
  );
  assert.equal(secure.get(account.providerId)?.refreshToken, "rotated-refresh-token");
});

test("An account disconnected while a form was open cannot write to Slack", async () => {
  const transport = vi.spyOn(globalThis, "fetch").mockImplementation(connectTransport);
  const account = await accounts.connectAccount();
  await accounts.disconnectAccount(account.id);
  transport.mockImplementation(async () => {
    assert.fail("Disconnected account must not call Slack");
  });
  const results = await accounts.applyToAccounts([account], createStatusRequest(defaultPresets[0], null));
  assert.equal(
    results[0].changes.every((change) => !change.ok && change.error?.includes("disconnected")),
    true,
  );
});

test("Concurrent preset saves preserve both saved presets", async () => {
  await Promise.all([
    state.savePreset({ ...defaultPresets[0], id: "saved-a", name: "Work" }),
    state.savePreset({ ...defaultPresets[1], id: "saved-b", name: "Break" }),
  ]);
  assert.deepEqual((await state.readPresets()).map((preset) => preset.name).sort(), ["Break", "Work"]);
});
