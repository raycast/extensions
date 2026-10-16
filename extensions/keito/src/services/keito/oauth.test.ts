import { describe, expect, it, vi } from "vitest";
import { resolveAuthConfig } from "./config";
import { KeitoHttpClient, FetchLike } from "./http";
import { normalizeIdentity } from "./normalize";
import { KEITO_OAUTH, KeitoOAuth, oauthFingerprint, StoredTokens, TokenStore } from "./oauth";
import { fullAccessMe } from "./testUtils";

const NOW = 1_800_000_000_000;

function jwt(claims: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "RS256" })}.${enc(claims)}.signature`;
}

function memoryTokens(initial?: StoredTokens): TokenStore & { value?: StoredTokens; writes: number } {
  const store = {
    value: initial,
    writes: 0,
    async get() {
      return store.value ? { ...store.value } : undefined;
    },
    async set(tokens: StoredTokens) {
      store.writes++;
      store.value = { ...tokens };
    },
    async remove() {
      store.value = undefined;
    },
  };
  return store;
}

interface TokenCall {
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
}

/** Scripted token endpoint. Each handler receives the form parameters. */
function tokenEndpoint(
  ...responses: ((params: Record<string, string>) => { status?: number; body?: unknown } | Error)[]
) {
  const calls: TokenCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const params = Object.fromEntries(new URLSearchParams(init.body ?? ""));
    calls.push({ url, headers: init.headers, params });
    const handler = responses.length > 1 ? responses.shift()! : responses[0];
    const result = handler(params);
    if (result instanceof Error) throw result;
    return {
      status: result.status ?? 200,
      headers: { get: () => null },
      text: async () => (result.body === undefined ? "" : JSON.stringify(result.body)),
    };
  };
  return { fetch, calls };
}

const authorizer = (overrides: Partial<{ redirectUri: string }> = {}) => ({
  authorize: vi.fn(async () => ({
    code: "auth-code",
    codeVerifier: "verifier-123",
    redirectUri: overrides.redirectUri ?? KEITO_OAUTH.redirectUri,
  })),
});

function oauth(store: TokenStore, fetch: FetchLike, extra: Partial<ConstructorParameters<typeof KeitoOAuth>[0]> = {}) {
  return new KeitoOAuth({ store, fetch, now: () => NOW, nonce: () => "nonce-abc", ...extra });
}

describe("sign-in (authorization code + PKCE)", () => {
  it("sends a fresh nonce and exchanges the code as a form POST without a client secret", async () => {
    const store = memoryTokens();
    const onSignIn = vi.fn(async () => undefined);
    const auth = authorizer();
    const endpoint = tokenEndpoint(() => ({
      body: {
        access_token: "access-1",
        refresh_token: "refresh-1",
        id_token: jwt({ sub: "user_1", nonce: "nonce-abc", aud: KEITO_OAUTH.clientId }),
        expires_in: 300,
        token_type: "Bearer",
      },
    }));
    const client = oauth(store, endpoint.fetch, { authorizer: auth, onSignIn });

    expect(await client.getAccessToken({ interactive: true })).toBe("access-1");
    expect(auth.authorize).toHaveBeenCalledWith({ nonce: "nonce-abc" });
    expect(endpoint.calls).toHaveLength(1);
    const [call] = endpoint.calls;
    expect(call.url).toBe("https://auth.keito.ai/oauth2/token");
    expect(call.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(call.params).toEqual({
      grant_type: "authorization_code",
      client_id: "client_01M52K79JXK4NXVH05RY87VZ9P",
      code: "auth-code",
      code_verifier: "verifier-123",
      redirect_uri: "https://raycast.com/redirect?packageName=Extension",
    });
    expect(store.value).toMatchObject({ accessToken: "access-1", refreshToken: "refresh-1", expiresAt: NOW + 300_000 });
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it("generates a different random nonce for each sign-in by default", async () => {
    const nonces: string[] = [];
    const auth = {
      authorize: async ({ nonce }: { nonce: string }) => {
        nonces.push(nonce);
        throw new Error("cancelled");
      },
    };
    const client = new KeitoOAuth({ store: memoryTokens(), authorizer: auth, fetch: tokenEndpoint(() => ({})).fetch });
    await client.signIn().catch(() => undefined);
    await client.signIn().catch(() => undefined);
    expect(nonces[0]).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  it.each([
    ["a different nonce", { sub: "u", nonce: "other", aud: KEITO_OAUTH.clientId }],
    ["no nonce", { sub: "u", aud: KEITO_OAUTH.clientId }],
    ["another audience", { sub: "u", nonce: "nonce-abc", aud: "client_someone_else" }],
  ])("rejects an ID token with %s and stores nothing", async (_label, claims) => {
    const store = memoryTokens();
    const endpoint = tokenEndpoint(() => ({ body: { access_token: "a", id_token: jwt(claims), expires_in: 300 } }));
    await expect(oauth(store, endpoint.fetch, { authorizer: authorizer() }).signIn()).rejects.toMatchObject({
      kind: "signed_out",
    });
    expect(store.value).toBeUndefined();
  });

  it("refuses an unexpected redirect URI before exchanging the code", async () => {
    const endpoint = tokenEndpoint(() => ({ body: { access_token: "a" } }));
    const client = oauth(memoryTokens(), endpoint.fetch, {
      authorizer: authorizer({ redirectUri: "https://raycast.com/redirect?packageName=keito" }),
    });
    await expect(client.signIn()).rejects.toMatchObject({ kind: "unexpected_response" });
    expect(endpoint.calls).toHaveLength(0);
  });

  it("reports a rejected code without leaking it", async () => {
    const endpoint = tokenEndpoint(() => ({
      status: 400,
      body: { error: "invalid_grant", error_description: "bad code" },
    }));
    const error = await oauth(memoryTokens(), endpoint.fetch, { authorizer: authorizer() })
      .signIn()
      .catch((e) => e);
    expect(error).toMatchObject({ kind: "signed_out" });
    expect(error.message).toContain("invalid_grant");
    expect(error.message).not.toContain("auth-code");
    expect(error.message).not.toContain("verifier-123");
  });

  it("shares one browser sign-in between concurrent callers", async () => {
    const auth = authorizer();
    const endpoint = tokenEndpoint(() => ({ body: { access_token: "a", expires_in: 300 } }));
    const client = oauth(memoryTokens(), endpoint.fetch, { authorizer: auth });
    await Promise.all([client.getAccessToken({ interactive: true }), client.getAccessToken({ interactive: true })]);
    expect(auth.authorize).toHaveBeenCalledTimes(1);
  });
});

describe("access tokens and refresh-token rotation", () => {
  const signedIn = (expiresInMs: number): StoredTokens => ({
    accessToken: "access-old",
    refreshToken: "refresh-old",
    idToken: jwt({ sub: "user_1" }),
    expiresAt: NOW + expiresInMs,
  });

  it("uses a fresh access token without calling the token endpoint", async () => {
    const endpoint = tokenEndpoint(() => ({ body: {} }));
    expect(await oauth(memoryTokens(signedIn(200_000)), endpoint.fetch).getAccessToken({ interactive: false })).toBe(
      "access-old",
    );
    expect(endpoint.calls).toHaveLength(0);
  });

  it("refreshes 30 seconds before expiry and saves the rotated refresh token", async () => {
    const store = memoryTokens(signedIn(20_000));
    const endpoint = tokenEndpoint(() => ({
      body: { access_token: "access-new", refresh_token: "refresh-new", expires_in: 300 },
    }));
    expect(await oauth(store, endpoint.fetch).getAccessToken({ interactive: false })).toBe("access-new");
    expect(endpoint.calls[0].params).toEqual({
      grant_type: "refresh_token",
      client_id: KEITO_OAUTH.clientId,
      refresh_token: "refresh-old",
    });
    expect(store.value).toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      idToken: signedIn(0).idToken, // kept when the refresh response has no ID token
      expiresAt: NOW + 300_000,
    });
  });

  it("keeps the old refresh token when the server does not rotate it", async () => {
    const store = memoryTokens(signedIn(-1));
    const endpoint = tokenEndpoint(() => ({ body: { access_token: "access-new", expires_in: 300 } }));
    await oauth(store, endpoint.fetch).getAccessToken({ interactive: false });
    expect(store.value?.refreshToken).toBe("refresh-old");
  });

  it("refreshes once for concurrent requests, so rotation cannot invalidate a parallel refresh", async () => {
    const store = memoryTokens(signedIn(-1));
    const endpoint = tokenEndpoint((p) =>
      p.refresh_token === "refresh-old"
        ? { body: { access_token: "access-new", refresh_token: "refresh-new", expires_in: 300 } }
        : { status: 400, body: { error: "invalid_grant" } },
    );
    const client = oauth(store, endpoint.fetch);
    const tokens = await Promise.all([1, 2, 3].map(() => client.getAccessToken({ interactive: false })));
    expect(tokens).toEqual(["access-new", "access-new", "access-new"]);
    expect(endpoint.calls).toHaveLength(1);
  });

  it("adopts tokens another Raycast command rotated first instead of signing out", async () => {
    const store = memoryTokens(signedIn(-1));
    const endpoint = tokenEndpoint(() => {
      // Simulate the menu bar refreshing in another process while this request is in flight.
      store.value = { accessToken: "access-other", refreshToken: "refresh-other", expiresAt: NOW + 300_000 };
      return { status: 400, body: { error: "invalid_grant" } };
    });
    expect(await oauth(store, endpoint.fetch).getAccessToken({ interactive: false })).toBe("access-other");
    expect(store.value?.refreshToken).toBe("refresh-other");
  });

  it("signs out when the refresh token is rejected, and only signs in again when interactive", async () => {
    const store = memoryTokens(signedIn(-1));
    const endpoint = tokenEndpoint(
      () => ({ status: 400, body: { error: "invalid_grant" } }),
      () => ({ body: { access_token: "access-signed-in", expires_in: 300 } }),
    );
    const auth = authorizer();
    const client = oauth(store, endpoint.fetch, { authorizer: auth });
    await expect(client.getAccessToken({ interactive: false })).rejects.toMatchObject({ kind: "signed_out" });
    expect(store.value).toBeUndefined();
    expect(auth.authorize).not.toHaveBeenCalled();
    expect(await client.getAccessToken({ interactive: true })).toBe("access-signed-in");
  });

  it("keeps tokens when the sign-in service is unreachable or failing", async () => {
    for (const response of [new TypeError("fetch failed"), { status: 503 }] as const) {
      const store = memoryTokens(signedIn(-1));
      const endpoint = tokenEndpoint(() => response);
      await expect(oauth(store, endpoint.fetch).getAccessToken({ interactive: false })).rejects.toMatchObject({
        kind: response instanceof Error ? "network" : "server",
      });
      expect(store.value?.refreshToken).toBe("refresh-old");
    }
  });
});

describe("Keito API requests with OAuth", () => {
  function apiFetch(responses: number[]) {
    const seen: Record<string, string>[] = [];
    const fetch: FetchLike = async (url, init) => {
      if (url.startsWith(KEITO_OAUTH.tokenUrl)) {
        return {
          status: 200,
          headers: { get: () => null },
          text: async () => JSON.stringify({ access_token: "access-refreshed", refresh_token: "r2", expires_in: 300 }),
        };
      }
      seen.push(init.headers);
      const status = responses.shift() ?? 200;
      return { status, headers: { get: () => null }, text: async () => (status === 200 ? '{"ok":true}' : "{}") };
    };
    return { fetch, seen };
  }

  it("sends only the bearer access token, without Keito-Account-Id", async () => {
    const { fetch, seen } = apiFetch([200]);
    const store = memoryTokens({ accessToken: "access-1", refreshToken: "r1", expiresAt: NOW + 300_000 });
    const http = new KeitoHttpClient({ auth: oauth(store, fetch).provider({ interactive: false }), fetch });
    await http.request("GET", "/users/me");
    expect(seen[0].Authorization).toBe("Bearer access-1");
    expect(seen[0]["Keito-Account-Id"]).toBeUndefined();
  });

  it("refreshes and retries once after a 401, including for writes", async () => {
    const { fetch, seen } = apiFetch([401, 200]);
    const store = memoryTokens({ accessToken: "access-1", refreshToken: "r1", expiresAt: NOW + 300_000 });
    const http = new KeitoHttpClient({ auth: oauth(store, fetch).provider({ interactive: false }), fetch });
    expect((await http.request("POST", "/time_entries", { body: { a: 1 } })).data).toEqual({ ok: true });
    expect(seen.map((h) => h.Authorization)).toEqual(["Bearer access-1", "Bearer access-refreshed"]);
  });

  it("reports signed out when Keito still returns 401 after a refresh", async () => {
    const { fetch, seen } = apiFetch([401, 401, 401]);
    const store = memoryTokens({ accessToken: "access-1", refreshToken: "r1", expiresAt: NOW + 300_000 });
    const http = new KeitoHttpClient({ auth: oauth(store, fetch).provider({ interactive: false }), fetch });
    await expect(http.request("GET", "/users/me")).rejects.toMatchObject({ kind: "signed_out", isSetupProblem: true });
    expect(seen).toHaveLength(2);
  });

  it("identifies the account without a Company ID", () => {
    expect(
      normalizeIdentity({ ...fullAccessMe, company: { id: "cm_any", name: "Acme" } }, undefined, [], "oauth"),
    ).toMatchObject({
      companyId: "cm_any",
      credentialType: "oauth",
    });
  });
});

describe("choosing the sign-in method", () => {
  it("uses OAuth when both preference fields are blank, and an integration key when both are set", () => {
    expect(resolveAuthConfig({})).toEqual({ kind: "oauth" });
    expect(resolveAuthConfig({ token: " ", accountID: "" })).toEqual({ kind: "oauth" });
    expect(resolveAuthConfig({ token: "kto_abc", accountID: "cm1" })).toEqual({
      kind: "api_key",
      token: "kto_abc",
      accountId: "cm1",
    });
    expect(() => resolveAuthConfig({ token: "kto_abc" })).toThrow(
      expect.objectContaining({ kind: "malformed_credentials" }),
    );
    expect(() => resolveAuthConfig({ accountID: "cm1" })).toThrow(
      expect.objectContaining({ kind: "malformed_credentials" }),
    );
  });

  it("fingerprints the signed-in account, not the short-lived access token", () => {
    const a1 = oauthFingerprint({ accessToken: "x", idToken: jwt({ sub: "user_1" }) });
    const a2 = oauthFingerprint({ accessToken: "y", idToken: jwt({ sub: "user_1" }) });
    const b = oauthFingerprint({ accessToken: "x", idToken: jwt({ sub: "user_2" }) });
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
    expect(a1).not.toContain("user_1");
  });
});
