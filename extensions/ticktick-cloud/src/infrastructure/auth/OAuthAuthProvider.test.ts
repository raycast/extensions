import { describe, expect, it } from "vitest";

import { OAuthAuthProvider } from "./OAuthAuthProvider";
import type { StoredOAuthTokens } from "./OAuthClientPort";

const SESSION = "oauth:01890f67-7d23-7d8a-b456-426614174000";
const NEW_SESSION = "oauth:01890f67-7d23-7d8a-b456-426614174001";

describe("OAuthAuthProvider", () => {
  it("returns an unexpired stored token without a network request", async () => {
    let fetches = 0;
    const provider = new OAuthAuthProvider({
      target: "mcp",
      endpoints: { authorizationEndpoint: "https://auth", tokenEndpoint: "https://token" },
      clientId: () => "client",
      client: {
        authorizationRequest: async () => {
          throw new Error("unexpected");
        },
        authorize: async () => {
          throw new Error("unexpected");
        },
        getTokens: async () => ({
          accessToken: "stored",
          scope: "tasks:read tasks:write",
          updatedAt: new Date(),
          isExpired: false,
        }),
        setTokens: async () => undefined,
        removeTokens: async () => undefined,
      },
      fetch: async () => {
        fetches++;
        throw new Error("unexpected");
      },
      sessionStore: { get: async () => undefined, set: async () => undefined, remove: async () => undefined },
      randomUUID: () => "01890f67-7d23-7d8a-b456-426614174001",
      clearAccount: async () => undefined,
    });
    await expect(provider.getAccessToken()).resolves.toBe("stored");
    expect(fetches).toBe(0);
  });

  it("does not use a malformed stored token or inadequate stored scope", async () => {
    const client = fakeClient();
    client.getTokens = async () => ({
      accessToken: "   ",
      scope: "tasks:read",
      updatedAt: new Date(),
      isExpired: false,
    });
    await expect(
      makeProvider(client, async () => json({ access_token: "new", token_type: "Bearer" })).getAccessToken()
    ).resolves.toBe("new");
    expect(client.removed).toBe(1);
  });

  it("authorizes and exchanges the code with the target resource only", async () => {
    const posts: RequestInit[] = [];
    const client = fakeClient();
    client.getTokens = async () => undefined;
    const provider = makeProvider(client, async (_url, init) => {
      posts.push(init!);
      return json({ access_token: "access", token_type: "Bearer", refresh_token: "refresh", expires_in: 5 });
    });
    await expect(provider.getAccessToken()).resolves.toBe("access");
    expect(client.authorizationOptions).toEqual({
      endpoint: "https://auth",
      clientId: "client",
      scope: "tasks:read tasks:write",
      extraParameters: { resource: "https://mcp.ticktick.com/" },
    });
    expect(new URLSearchParams(posts[0].body as string).toString()).toBe(
      "grant_type=authorization_code&code=code&client_id=client&redirect_uri=https%3A%2F%2Fraycast.com%2Fredirect%3FpackageName%3DExtension&code_verifier=verifier&resource=https%3A%2F%2Fmcp.ticktick.com%2F"
    );
    expect(posts[0].redirect).toBe("error");
    expect(posts[0].body).not.toContain("client_secret");
    expect(await provider.accountCacheKey()).toBe(NEW_SESSION);
  });

  it("rejects a wrong Raycast redirect and safe malformed token responses", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    client.request.redirectURI = "https://wrong";
    await expect(makeProvider(client, async () => json({})).getAccessToken()).rejects.toMatchObject({
      name: "AuthenticationError",
      message: "OAuth authorization could not be completed safely.",
    });
    client.request.redirectURI = "https://raycast.com/redirect?packageName=Extension";
    for (const response of [
      { access_token: " ", token_type: "Bearer" },
      { access_token: "a", token_type: "DPoP" },
      { access_token: "a", token_type: "Bearer", expires_in: -1 },
      { access_token: "a", token_type: "Bearer", scope: "tasks:read" },
    ]) {
      await expect(makeProvider(client, async () => json(response)).getAccessToken()).rejects.toMatchObject({
        name: "AuthenticationError",
        message: "TickTick returned an invalid OAuth token response.",
      });
    }
  });

  it("normalizes an omitted returned scope to requested scopes", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    await makeProvider(client, async () => json({ access_token: "access", token_type: "bearer" })).getAccessToken();
    expect(client.saved[0]).toMatchObject({ scope: "tasks:read tasks:write" });
  });

  it("refreshes expired tokens, preserving refresh token and account namespace", async () => {
    const client = fakeClient();
    client.getTokens = async () => ({
      accessToken: "old",
      refreshToken: "old-refresh",
      scope: "tasks:read tasks:write",
      expiresIn: 1,
      updatedAt: new Date(),
      isExpired: true,
    });
    const sessions = memorySession(SESSION);
    const provider = makeProvider(
      client,
      async () => json({ access_token: "fresh", token_type: "Bearer", expires_in: 2 }),
      sessions
    );
    await expect(provider.getAccessToken()).resolves.toBe("fresh");
    expect(client.saved[0]).toMatchObject({ refresh_token: undefined });
    expect(client.previous[0]).toBe("old-refresh");
    expect(await provider.accountCacheKey()).toBe(SESSION);
  });

  it("trims a refresh token before sending or preserving it", async () => {
    const client = fakeClient();
    client.getTokens = async () => ({
      accessToken: "old",
      refreshToken: "  refresh  ",
      expiresIn: 1,
      scope: "tasks:read tasks:write",
      updatedAt: new Date(),
      isExpired: true,
    });
    const posts: RequestInit[] = [];
    await makeProvider(
      client,
      async (_url, init) => {
        posts.push(init!);
        return json({ access_token: "new", token_type: "Bearer" });
      },
      memorySession(SESSION)
    ).getAccessToken();
    expect(new URLSearchParams(posts[0].body as string).get("refresh_token")).toBe("refresh");
    expect(client.previous[0]).toBe("refresh");
  });

  it("removes malformed session values without exposing them to account cleanup", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    const sessions = memorySession("oauth:token-bearing-secret");
    const cleared: string[] = [];
    await makeProvider(
      client,
      async () => json({ access_token: "new", token_type: "Bearer" }),
      sessions,
      cleared
    ).getAccessToken();
    expect(cleared).toEqual([]);
    expect(sessions.events[0]).toBe("remove");
    expect(sessions.events).not.toContain("set:oauth:token-bearing-secret");
  });

  it("treats corrupt stored token ports as unusable without throwing their contents", async () => {
    for (const stored of [
      { accessToken: 3, scope: "tasks:read tasks:write", updatedAt: new Date(), isExpired: false },
      { accessToken: "a", scope: 3, updatedAt: new Date(), isExpired: false },
      { accessToken: "a", scope: "tasks:read", updatedAt: new Date(), isExpired: false },
      {
        accessToken: "a",
        scope: "tasks:read tasks:write",
        expiresIn: Infinity,
        updatedAt: new Date(),
        isExpired: false,
      },
      { accessToken: "a", scope: "tasks:read tasks:write", updatedAt: new Date(), isExpired: () => false },
    ]) {
      const client = fakeClient();
      client.getTokens = async () => stored as unknown as StoredOAuthTokens;
      await expect(
        makeProvider(client, async () => json({ access_token: "new", token_type: "Bearer" })).getAccessToken()
      ).resolves.toBe("new");
    }
  });

  it("cleans expired unusable tokens before reauthorization and after failed refresh", async () => {
    const client = fakeClient();
    client.getTokens = async () => ({ accessToken: "old", expiresIn: 1, updatedAt: new Date(), isExpired: true });
    const sessions = memorySession(SESSION);
    const cleared: string[] = [];
    await makeProvider(
      client,
      async () => json({ access_token: "new", token_type: "Bearer" }),
      sessions,
      cleared
    ).getAccessToken();
    expect(client.removed).toBe(1);
    expect(cleared).toEqual([SESSION]);
    expect(sessions.events.slice(0, 2)).toEqual(["remove", `set:${NEW_SESSION}`]);
  });

  it("invalidates an account and detects automatic Raycast logout before a new account", async () => {
    const client = fakeClient();
    const sessions = memorySession(SESSION);
    const cleared: string[] = [];
    const provider = makeProvider(
      client,
      async () => json({ access_token: "new", token_type: "Bearer" }),
      sessions,
      cleared
    );
    await provider.invalidate();
    expect(cleared).toEqual([SESSION]);
    expect(sessions.value).toBeUndefined();
    client.getTokens = async () => undefined;
    await provider.getAccessToken();
    expect(cleared).toEqual([SESSION]);
    expect(await provider.accountCacheKey()).toBe(NEW_SESSION);
  });

  it("clears an old automatic-logout namespace before authorizing a different account", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    const sessions = memorySession(SESSION);
    const cleared: string[] = [];
    await makeProvider(
      client,
      async () => json({ access_token: "new", token_type: "Bearer" }),
      sessions,
      cleared
    ).getAccessToken();
    expect(cleared).toEqual([SESSION]);
    expect(sessions.events).toEqual(["remove", `set:${NEW_SESSION}`]);
  });

  it("rejects an empty authorization code or PKCE verifier", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    client.request.codeVerifier = "";
    await expect(
      makeProvider(client, async () => json({ access_token: "x", token_type: "Bearer" })).getAccessToken()
    ).rejects.toMatchObject({ message: "OAuth authorization could not be completed safely." });
    client.request.codeVerifier = "verifier";
    client.authorize = async () => ({ authorizationCode: "  " });
    await expect(
      makeProvider(client, async () => json({ access_token: "x", token_type: "Bearer" })).getAccessToken()
    ).rejects.toMatchObject({ message: "OAuth authorization could not be completed safely." });
  });

  it("uses isolated Open API resource, provider session, and token exchange", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    const posts: RequestInit[] = [];
    const provider = makeProvider(
      client,
      async (_url, init) => {
        posts.push(init!);
        return json({ access_token: "open", token_type: "Bearer" });
      },
      memorySession(undefined),
      [],
      "openapi"
    );
    await provider.getAccessToken();
    expect(client.authorizationOptions).toMatchObject({
      extraParameters: { resource: "https://api.ticktick.com/open/v1/" },
    });
    expect(new URLSearchParams(posts[0].body as string).get("resource")).toBe("https://api.ticktick.com/open/v1/");
    expect(await provider.accountCacheKey()).toBe(NEW_SESSION);
  });

  it("authorizes before creating a non-secret account namespace", async () => {
    const client = fakeClient();
    const sessions = memorySession(undefined);
    const provider = makeProvider(client, async () => json({ access_token: "new", token_type: "Bearer" }), sessions);
    await expect(provider.accountCacheKey()).resolves.toBe(NEW_SESSION);
    expect(client.saved).toHaveLength(1);
    expect(sessions.events).toEqual([`set:${NEW_SESSION}`]);
  });

  it("cleans a failed refresh then reauthorizes without retrying the refresh request", async () => {
    const client = fakeClient();
    client.getTokens = async () => ({
      accessToken: "old",
      refreshToken: "refresh",
      scope: "tasks:read tasks:write",
      expiresIn: 1,
      updatedAt: new Date(),
      isExpired: true,
    });
    let calls = 0;
    const sessions = memorySession(SESSION);
    await expect(
      makeProvider(
        client,
        async () =>
          ++calls === 1
            ? new Response("failure", { status: 500 })
            : json({ access_token: "new", token_type: "Bearer" }),
        sessions
      ).getAccessToken()
    ).resolves.toBe("new");
    expect(calls).toBe(2);
    expect(sessions.events).toEqual(["remove", `set:${NEW_SESSION}`]);
  });

  it("uses body-free errors for network, redirect, non-2xx, and invalid JSON token responses", async () => {
    const client = fakeClient();
    client.getTokens = async () => undefined;
    const failures: Array<typeof globalThis.fetch> = [
      async () => {
        throw new Error("access_token=secret");
      },
      async () => new Response("access_token=secret", { status: 302, headers: { location: "https://elsewhere" } }),
      async () => new Response("access_token=secret", { status: 401 }),
      async () => new Response("not json", { status: 200 }),
    ];
    for (const fetch of failures) {
      await expect(makeProvider(client, fetch).getAccessToken()).rejects.toMatchObject({ name: "AuthenticationError" });
      await expect(makeProvider(client, fetch).getAccessToken()).rejects.not.toThrow(/secret/);
    }
  });

  it("removes the session even when token or account cleanup fails", async () => {
    const client = fakeClient();
    client.removeTokens = async () => {
      throw new Error("failure");
    };
    const sessions = memorySession(SESSION);
    const provider = makeProvider(client, async () => json({}), sessions, []);
    await expect(provider.invalidate()).rejects.toThrow("failure");
    expect(sessions.value).toBeUndefined();
  });
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}
function fakeClient() {
  const result = {
    request: {
      codeVerifier: "verifier",
      redirectURI: "https://raycast.com/redirect?packageName=Extension",
      toURL: () => "https://auth",
    },
    authorizationOptions: undefined as unknown,
    saved: [] as unknown[],
    previous: [] as (string | undefined)[],
    removed: 0,
    authorizationRequest: async (options: unknown) => {
      result.authorizationOptions = options;
      return result.request;
    },
    authorize: async () => ({ authorizationCode: "code" }),
    getTokens: async (): Promise<StoredOAuthTokens | undefined> => undefined,
    setTokens: async (value: unknown, previous?: string) => {
      result.saved.push(value);
      result.previous.push(previous);
    },
    removeTokens: async () => {
      result.removed++;
    },
  };
  return result;
}
function memorySession(value: string | undefined) {
  const result = {
    value,
    events: [] as string[],
    get: async () => result.value,
    set: async (v: string) => {
      result.value = v;
      result.events.push(`set:${v}`);
    },
    remove: async () => {
      result.value = undefined;
      result.events.push("remove");
    },
  };
  return result;
}
function makeProvider(
  client: ReturnType<typeof fakeClient>,
  fetch: typeof globalThis.fetch,
  sessionStore = memorySession(undefined),
  cleared: string[] = [],
  target: "mcp" | "openapi" = "mcp"
) {
  return new OAuthAuthProvider({
    target,
    endpoints: { authorizationEndpoint: "https://auth", tokenEndpoint: "https://token" },
    clientId: () => "client",
    client,
    fetch,
    sessionStore,
    randomUUID: () => "01890f67-7d23-7d8a-b456-426614174001",
    clearAccount: async (key) => {
      cleared.push(key);
    },
  });
}
