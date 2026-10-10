import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { raycastLocalStorageMock } from "./raycastApiMock";

interface Tokens {
  accessToken: string;
  isExpired: () => boolean;
  refreshToken?: string;
}
const stores = new Map<string, Tokens>();
const credentialReads: string[] = [];
const requests: Array<{
  endpoint: string;
  clientId: string;
  scope: string;
}> = [];
const authorizeUrls: URL[] = [];
let browserCount = 0;
let workosIssuer = "https://scholarly-hay-77.authkit.app";
let primary = "workos";
let tokenFailure = false;
let tokenOutage = false;
let malformedToken = false;
let revocationFailure = false;
let disconnectStatus = 204;
const posts: Array<{
  url: string;
  body: URLSearchParams;
  redirect: RequestRedirect | undefined;
  authorization: string | null;
}> = [];
const originalFetch = globalThis.fetch;
const toasts: Array<{ title: string; message?: string }> = [];

mock.module("@raycast/api", () => ({
  environment: { isDevelopment: false },
  getPreferenceValues: () => ({ apiKey: "" }),
  Action: Object.assign(() => null, { Style: { Destructive: "destructive" } }),
  Icon: { Logout: "logout" },
  Toast: { Style: { Failure: "failure", Success: "success" } },
  showToast: (toast: { title: string; message?: string }) => {
    toasts.push(toast);
    return Promise.resolve();
  },
  LocalStorage: raycastLocalStorageMock,
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      private readonly options: { providerId: string };
      constructor(options: { providerId: string }) {
        this.options = options;
      }
      getTokens() {
        credentialReads.push(this.options.providerId);
        return Promise.resolve(stores.get(this.options.providerId));
      }
      removeTokens() {
        stores.delete(this.options.providerId);
        return Promise.resolve();
      }
      setTokens(tokens: {
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
      }) {
        stores.set(this.options.providerId, {
          ...tokens,
          isExpired: () => tokens.expiresIn === 1,
        });
        return Promise.resolve();
      }
      authorizationRequest(options: (typeof requests)[number]) {
        requests.push(options);
        return Promise.resolve({
          codeChallenge: "native-challenge",
          codeVerifier: "native-verifier",
          redirectURI: "https://raycast.com/redirect?package=teak-raycast",
          state: "native-state",
        });
      }
      authorize(options: { url: string }) {
        authorizeUrls.push(new URL(options.url));
        browserCount += 1;
        return Promise.resolve({ authorizationCode: "native-code" });
      }
    },
  },
}));
const oauth = await import(`../lib/oauth?oauth-tests=${crypto.randomUUID()}`);
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const replacementIssuer = "https://replacement-teak.authkit.app";
const transport = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const issuer = workosIssuer;
  const client = "client_01M47GV3CYKFW0H78W0XYKGTM5";
  if (url.includes("oauth-protected-resource")) {
    return Promise.resolve(
      json({
        authorization_servers: [issuer],
        resource: "https://teakvault.com/mcp",
      }),
    );
  }
  if (url.includes("teak-oauth-clients")) {
    return Promise.resolve(
      json({
        issuer,
        primary,
        clients: Object.fromEntries(
          ["cli", "raycast", "chrome", "firefox", "safari"].map((surface) => [
            surface,
            client,
          ]),
        ),
      }),
    );
  }
  if (url.includes("oauth-authorization-server")) {
    return Promise.resolve(
      json({
        issuer,
        code_challenge_methods_supported: ["S256"],
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/oauth2/token`,
      }),
    );
  }
  posts.push({
    url,
    body: new URLSearchParams(String(init?.body)),
    redirect: init?.redirect,
    authorization: new Headers(init?.headers).get("Authorization"),
  });
  if (url.endsWith("/oauth/disconnect")) {
    return Promise.resolve(
      new Response(null, {
        status: revocationFailure ? 503 : disconnectStatus,
      }),
    );
  }
  if (malformedToken) {
    return Promise.resolve(
      new Response("invalid provider response", { status: 200 }),
    );
  }
  const failedStatus = tokenFailure ? 401 : 200;
  return Promise.resolve(
    json(
      {
        access_token: "access-new",
        refresh_token: "refresh-new",
        expires_in: 300,
      },
      tokenOutage ? 503 : failedStatus,
    ),
  );
}) as typeof fetch;
beforeEach(async () => {
  for (const key of Object.keys(await raycastLocalStorageMock.allItems())) {
    await raycastLocalStorageMock.removeItem(key);
  }
  stores.clear();
  credentialReads.length = 0;
  requests.length = 0;
  authorizeUrls.length = 0;
  toasts.length = 0;
  posts.length = 0;
  browserCount = 0;
  workosIssuer = "https://scholarly-hay-77.authkit.app";
  primary = "workos";
  tokenFailure = false;
  tokenOutage = false;
  malformedToken = false;
  revocationFailure = false;
  disconnectStatus = 204;
  // A fresh transport identity gives each scenario a fresh canonical SDK cache.
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("pre-WorkOS credentials neither sign in nor block a fresh WorkOS sign-in", async () => {
  stores.set("teak", {
    accessToken: "legacy",
    refreshToken: "legacy-refresh",
    isExpired: () => false,
  });
  expect(await oauth.hasStoredTeakSession()).toBe(false);
  expect(await oauth.authorizeTeak()).toBe("access-new");
  expect(browserCount).toBe(1);
  expect(posts.map((post) => post.url)).toEqual([
    "https://scholarly-hay-77.authkit.app/oauth2/token",
  ]);
  expect(posts[0].body.get("refresh_token")).toBeNull();
});

test("a server that does not advertise WorkOS is refused before browser sign-in", async () => {
  primary = "betterauth";
  // Discovery itself refuses any provider other than WorkOS.
  await expect(oauth.authorizeTeak()).rejects.toThrow("Unable to reach Teak");
  expect(browserCount).toBe(0);
  expect(posts).toHaveLength(0);
});

test("WorkOS binds PKCE and token exchange to the REST resource and dynamic client", async () => {
  expect(await oauth.authorizeTeak()).toBe("access-new");
  expect(requests[0].endpoint).toBe(
    "https://scholarly-hay-77.authkit.app/authorize",
  );
  expect(requests[0].clientId).toBe("client_01M47GV3CYKFW0H78W0XYKGTM5");
  expect(requests[0].scope).toBe("openid profile email offline_access");
  const url = authorizeUrls[0];
  expect(url.origin + url.pathname).toBe(
    "https://scholarly-hay-77.authkit.app/authorize",
  );
  expect(Object.fromEntries(url.searchParams)).toEqual({
    response_type: "code",
    client_id: "client_01M47GV3CYKFW0H78W0XYKGTM5",
    resource: "https://teakvault.com/api",
    redirect_uri: "https://raycast.com/redirect?package=teak-raycast",
    code_challenge: "native-challenge",
    code_challenge_method: "S256",
    scope: "openid profile email offline_access",
    state: "native-state",
  });
  expect(posts[0].body.get("resource")).toBe("https://teakvault.com/api");
  expect(posts[0].body.get("code_verifier")).toBe("native-verifier");
  expect(posts[0].body.get("redirect_uri")).toBe(
    "https://raycast.com/redirect?package=teak-raycast",
  );
  expect(posts[0].redirect).toBe("error");
  expect(stores.get("teak")).toBeUndefined();
});

test("concurrent commands rotate a refresh token once without opening the browser", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "expired",
    refreshToken: "refresh-old",
    isExpired: () => true,
  });
  posts.length = 0;
  browserCount = 0;
  expect(
    await Promise.all([
      oauth.getStoredTeakAccessToken(),
      oauth.getStoredTeakAccessToken(),
      oauth.authorizeTeak(),
    ]),
  ).toEqual(["access-new", "access-new", "access-new"]);
  expect(posts.length).toBe(1);
  expect(posts[0].body.get("refresh_token")).toBe("refresh-old");
  expect(posts[0].body.get("resource")).toBe("https://teakvault.com/api");
  expect(stores.get(key)?.refreshToken).toBe("refresh-new");
  expect(browserCount).toBe(0);
});

test("a refresh response without a refresh token keeps the saved one", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "expired",
    refreshToken: "refresh-old",
    isExpired: () => true,
  });
  globalThis.fetch = ((input, init) =>
    String(input).endsWith("/oauth2/token")
      ? Promise.resolve(json({ access_token: "access-kept", expires_in: 300 }))
      : transport(input, init)) as typeof fetch;
  expect(await oauth.getStoredTeakAccessToken()).toBe("access-kept");
  expect(stores.get(key)).toMatchObject({
    accessToken: "access-kept",
    expiresIn: 300,
    refreshToken: "refresh-old",
  });
});

test("failed refresh refetches discovery and never sends the old token to a new issuer", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "expired",
    refreshToken: "old-provider",
    isExpired: () => true,
  });
  posts.length = 0;
  browserCount = 0;
  const firstTransport = globalThis.fetch;
  globalThis.fetch = ((input, init) => {
    if (String(input).endsWith("/oauth2/token")) {
      workosIssuer = replacementIssuer;
      tokenFailure = true;
    }
    return firstTransport(input, init);
  }) as typeof fetch;
  await expect(oauth.getStoredTeakAccessToken()).rejects.toThrow();
  expect(await oauth.hasStoredTeakSession()).toBe(false);
  expect(posts.map((post) => post.url)).toEqual([
    "https://scholarly-hay-77.authkit.app/oauth2/token",
  ]);
  expect(browserCount).toBe(0);
});

test("sign out revokes the rotated credential and retains it on provider failure", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "expired",
    refreshToken: "refresh-before-rotation",
    isExpired: () => true,
  });
  posts.length = 0;
  expect(await oauth.getStoredTeakAccessToken()).toBe("access-new");
  expect(posts[0].body.get("grant_type")).toBe("refresh_token");
  expect(posts[0].body.get("refresh_token")).toBe("refresh-before-rotation");
  revocationFailure = true;
  await expect(oauth.signOutTeak()).rejects.toThrow(
    "credentials are still saved",
  );
  expect(stores.size).toBe(1);
  revocationFailure = false;
  await oauth.signOutTeak();
  expect(posts.at(-1)?.url).toBe(
    "https://teakvault.com/api/v1/oauth/disconnect",
  );
  expect(posts.at(-1)?.authorization).toBe("Bearer access-new");
  expect(posts.at(-1)?.body.get("token")).toBeNull();
  expect(stores.size).toBe(0);
});

test("non-JSON token replies produce the sign-in error and store no credentials", async () => {
  malformedToken = true;
  await expect(oauth.authorizeTeak()).rejects.toThrow(
    "Invalid Teak sign-in response.",
  );
  expect(stores.size).toBe(0);
});

test("temporary refresh outage preserves credentials and never opens browser sign-in", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "expired",
    refreshToken: "still-valid",
    isExpired: () => true,
  });
  browserCount = 0;
  tokenOutage = true;
  await expect(oauth.authorizeTeak()).rejects.toThrow("connection");
  expect(browserCount).toBe(0);
  expect(stores.get(key)?.refreshToken).toBe("still-valid");
});

test("sign out after restart disconnects WorkOS and clears pre-WorkOS credentials locally", async () => {
  await oauth.authorizeTeak();
  const workosKey = Array.from(stores.keys())[0];
  // Records an older build saved for its Better Auth connections.
  const apiBaseUrl = "https://teakvault.com/api/v1";
  const legacyIssuer = "https://app.teakvault.com";
  const legacyClient = "teak-raycast";
  const scopedLegacyId = `teak:${apiBaseUrl}|${legacyIssuer}|${legacyClient}`;
  for (const providerId of ["teak", scopedLegacyId]) {
    await raycastLocalStorageMock.setItem(
      `teak.oauth.provider:${encodeURIComponent(apiBaseUrl)}:${providerId}`,
      JSON.stringify({
        apiBaseUrl,
        providerId,
        issuer: legacyIssuer,
        clientId: legacyClient,
        revocationEndpoint: "https://teakvault.com/api/api/oauth/revoke",
      }),
    );
  }
  stores.set("teak", {
    accessToken: "old-legacy",
    refreshToken: "old-legacy-refresh",
    isExpired: () => false,
  });
  stores.set(scopedLegacyId, { accessToken: "", isExpired: () => true });
  posts.length = 0;
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
  const restarted = await import(`../lib/oauth?restart=${crypto.randomUUID()}`);
  expect(await restarted.signOutTeak()).toBe("disconnected");
  expect(stores.has("teak")).toBe(false);
  expect(stores.has(scopedLegacyId)).toBe(false);
  expect(stores.has(workosKey)).toBe(false);
  expect(posts.map((post) => post.url)).toEqual([
    "https://teakvault.com/api/v1/oauth/disconnect",
  ]);
  expect(posts[0].authorization).toBe("Bearer access-new");
  expect(Object.keys(await raycastLocalStorageMock.allItems())).toEqual([]);
});

test("pre-WorkOS-only sign out clears locally and then signs in with WorkOS", async () => {
  stores.set("teak", {
    accessToken: "old-legacy",
    refreshToken: "old-legacy-refresh",
    isExpired: () => false,
  });
  expect(await oauth.signOutTeak()).toBe("disconnected");
  expect(stores.size).toBe(0);
  expect(posts).toHaveLength(0);
  expect(await oauth.authorizeTeak()).toBe("access-new");
  expect(browserCount).toBe(1);
});

test("tampered historical endpoints never receive saved credentials", async () => {
  await oauth.authorizeTeak();
  const registry = await raycastLocalStorageMock.allItems();
  const entry = Object.entries(registry).find(([, value]) =>
    JSON.parse(value).clientId.startsWith("client_"),
  );
  if (!entry) {
    throw new Error("Missing provider fixture");
  }
  const record = JSON.parse(entry[1]);
  await raycastLocalStorageMock.setItem(
    entry[0],
    JSON.stringify({
      ...record,
      issuer: "https://attacker.example",
    }),
  );
  posts.length = 0;
  workosIssuer = replacementIssuer;
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
  const restarted = await import(`../lib/oauth?tamper=${crypto.randomUUID()}`);
  try {
    await expect(restarted.signOutTeak()).rejects.toThrow("metadata");
    expect(posts.length).toBe(0);
    expect(stores.size).toBe(1);
  } finally {
    await raycastLocalStorageMock.setItem(entry[0], entry[1]);
  }
});

test("sign out scopes persisted connections to its deployment", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  const foreignKey =
    "teak.oauth.provider:" +
    encodeURIComponent("https://other-dev.convex.site/v1") +
    ":foreign";
  await raycastLocalStorageMock.setItem(
    foreignKey,
    "untrusted foreign deployment metadata",
  );
  await oauth.signOutTeak();
  expect(stores.has(key)).toBe(false);
  expect(await raycastLocalStorageMock.getItem(foreignKey)).toBe(
    "untrusted foreign deployment metadata",
  );
  await raycastLocalStorageMock.removeItem(foreignKey);
});

test("historical expired WorkOS access disconnects without browser or refresh token exposure", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "signed-expired-access",
    refreshToken: "secret-refresh",
    isExpired: () => true,
  });
  workosIssuer = replacementIssuer;
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
  browserCount = 0;
  posts.length = 0;
  const restarted = await import(
    `../lib/oauth?expired-disconnect=${crypto.randomUUID()}`
  );
  await restarted.signOutTeak();
  expect(stores.size).toBe(0);
  expect(browserCount).toBe(0);
  expect(posts).toHaveLength(1);
  expect(posts[0].authorization).toBe("Bearer signed-expired-access");
  expect(posts[0].body.has("refresh_token")).toBe(false);
});

test.each([401, 503, 200])(
  "disconnect HTTP %i retains credentials instead of claiming revocation",
  async (status) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    disconnectStatus = status;
    browserCount = 0;
    await expect(oauth.signOutTeak()).rejects.toThrow(
      "credentials are still saved",
    );
    expect(stores.get(key)?.refreshToken).toBe("refresh-new");
    expect(browserCount).toBe(0);
  },
);

test.each([204, 503])(
  "expired first logout refreshes its exact namespace once and retains rotation on failure (%i)",
  async (status) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    stores.set(key, {
      accessToken: "signed-expired-access",
      refreshToken: "saved-refresh",
      isExpired: () => true,
    });
    posts.length = 0;
    browserCount = 0;
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/oauth/disconnect")) {
        return new Response(null, {
          status:
            new Headers(init?.headers).get("Authorization") ===
            "Bearer signed-expired-access"
              ? 401
              : status,
        });
      }
      return transport(input, init);
    }) as typeof fetch;
    if (status === 204) {
      await oauth.signOutTeak();
      expect(stores.size).toBe(0);
    } else {
      await expect(oauth.signOutTeak()).rejects.toThrow(
        "credentials are still saved",
      );
      expect(stores.get(key)?.refreshToken).toBe("refresh-new");
    }
    const refreshes = posts.filter(
      (post) => post.body.get("grant_type") === "refresh_token",
    );
    expect(refreshes).toHaveLength(1);
    expect(refreshes[0].url).toBe(
      "https://scholarly-hay-77.authkit.app/oauth2/token",
    );
    expect(refreshes[0].body.get("client_id")).toBe(
      "client_01M47GV3CYKFW0H78W0XYKGTM5",
    );
    expect(refreshes[0].body.get("refresh_token")).toBe("saved-refresh");
    expect(refreshes[0].body.get("resource")).toBe("https://teakvault.com/api");
    expect(browserCount).toBe(0);
  },
);

test("WorkOS reauthorization refreshes its saved grant without browser replacement", async () => {
  await oauth.authorizeTeak();
  browserCount = 0;
  posts.length = 0;
  expect(await oauth.reauthorizeTeak()).toBe("access-new");
  expect(
    posts.filter((post) => post.body.get("grant_type") === "refresh_token"),
  ).toHaveLength(1);
  expect(
    posts.filter((post) => post.url.endsWith("/oauth/disconnect")),
  ).toHaveLength(0);
  expect(browserCount).toBe(0);
});
test("WorkOS reauthorization without refresh preserves the grant and requests explicit logout", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, { accessToken: "saved-access", isExpired: () => false });
  browserCount = 0;
  await expect(oauth.reauthorizeTeak()).rejects.toThrow(
    "Sign Out before reconnecting",
  );
  expect(stores.get(key)?.accessToken).toBe("saved-access");
  expect(browserCount).toBe(0);
});

test.each([false, true])(
  "access-only WorkOS token (expired=%s) requires Sign Out before fresh browser auth",
  async (expired) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    const saved = {
      accessToken: "access-only",
      isExpired: () => expired,
    };
    stores.set(key, saved);
    browserCount = 0;
    posts.length = 0;
    expect(await oauth.hasStoredTeakSession()).toBe(true);
    if (expired) {
      await expect(oauth.authorizeTeak()).rejects.toThrow(
        "Sign Out before reconnecting",
      );
    } else {
      const { request } = await import("../lib/api");
      globalThis.fetch = (async (input, init) => {
        if (String(input).endsWith("/cards")) {
          return json({}, 401);
        }
        return transport(input, init);
      }) as typeof fetch;
      await expect(request("/cards", (payload) => payload)).rejects.toThrow(
        "Sign Out before reconnecting",
      );
    }
    expect(stores.get(key)).toBe(saved);
    expect(browserCount).toBe(0);
    expect(posts).toHaveLength(0);

    disconnectStatus = 401;
    expect(await oauth.signOutTeak()).toBe("local-only");
    expect(stores.has(key)).toBe(false);
    expect(posts).toHaveLength(1);
    expect(posts[0].authorization).toBe("Bearer access-only");
    expect(posts[0].body.has("refresh_token")).toBe(false);
    expect(browserCount).toBe(0);

    disconnectStatus = 204;
    expect(await oauth.authorizeTeak()).toBe("access-new");
    expect(browserCount).toBe(1);
  },
);

test.each(["success", "server", "network"])(
  "access-only WorkOS Sign Out handles %s disconnect without refresh",
  async (outcome) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    const saved = { accessToken: "access-only", isExpired: () => false };
    stores.set(key, saved);
    posts.length = 0;
    browserCount = 0;
    if (outcome === "server") {
      disconnectStatus = 503;
    }
    if (outcome === "network") {
      globalThis.fetch = (async (input, init) => {
        if (String(input).endsWith("/oauth/disconnect")) {
          throw new Error("Network unavailable");
        }
        return transport(input, init);
      }) as typeof fetch;
    }
    if (outcome === "success") {
      expect(await oauth.signOutTeak()).toBe("disconnected");
      expect(stores.has(key)).toBe(false);
    } else {
      await expect(oauth.signOutTeak()).rejects.toThrow(
        "credentials are still saved",
      );
      expect(stores.get(key)).toBe(saved);
    }
    expect(posts.every((post) => !post.body.has("refresh_token"))).toBe(true);
    expect(browserCount).toBe(0);
  },
);

test.each([false, true])(
  "refresh-only WorkOS credential renews and disconnects (read first=%s)",
  async (readFirst) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    stores.set(key, {
      accessToken: "",
      refreshToken: "refresh-only",
      isExpired: () => true,
    });
    posts.length = 0;
    browserCount = 0;
    expect(await oauth.hasStoredTeakSession()).toBe(true);
    if (readFirst) {
      expect(await oauth.getStoredTeakAccessToken()).toBe("access-new");
      expect(stores.get(key)?.refreshToken).toBe("refresh-new");
      expect(browserCount).toBe(0);
    }
    expect(await oauth.signOutTeak()).toBe("disconnected");
    expect(posts.map((post) => post.url)).toEqual([
      "https://scholarly-hay-77.authkit.app/oauth2/token",
      "https://teakvault.com/api/v1/oauth/disconnect",
    ]);
    expect(posts[0].body.get("refresh_token")).toBe("refresh-only");
    expect(posts[1].authorization).toBe("Bearer access-new");
    expect(stores.has(key)).toBe(false);
    expect(browserCount).toBe(0);
  },
);

test("refresh-only historical WorkOS credential clears locally without sending its refresh token", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "",
    refreshToken: "historical-refresh-only",
    isExpired: () => true,
  });
  workosIssuer = replacementIssuer;
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
  const restarted = await import(
    `../lib/oauth?historical-refresh-only=${crypto.randomUUID()}`
  );
  posts.length = 0;
  browserCount = 0;
  expect(await restarted.signOutTeak()).toBe("local-only");
  expect(stores.has(key)).toBe(false);
  expect(posts).toHaveLength(0);
  expect(browserCount).toBe(0);
});

test.each(["unknown", "malformed", "network", "server"])(
  "refresh-only WorkOS Sign Out retains credentials on %s refresh failure",
  async (failure) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    const saved = {
      accessToken: "",
      refreshToken: "refresh-only",
      isExpired: () => true,
    };
    stores.set(key, saved);
    posts.length = 0;
    browserCount = 0;
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/oauth2/token")) {
        if (failure === "network") {
          throw new Error("Network unavailable");
        }
        if (failure === "malformed") {
          return new Response("{", { status: 400 });
        }
        return json(
          { error: failure === "server" ? "invalid_grant" : "invalid_request" },
          failure === "server" ? 503 : 400,
        );
      }
      return transport(input, init);
    }) as typeof fetch;
    await expect(oauth.signOutTeak()).rejects.toThrow(
      "credentials are still saved",
    );
    await expect(oauth.authorizeTeak()).rejects.toThrow();
    expect(stores.get(key)).toBe(saved);
    expect(browserCount).toBe(0);
  },
);

test("empty WorkOS token state requires explicit local Sign Out before browser auth", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, { accessToken: "", isExpired: () => true });
  posts.length = 0;
  browserCount = 0;
  expect(await oauth.hasStoredTeakSession()).toBe(true);
  await expect(oauth.authorizeTeak()).rejects.toThrow(
    "Sign Out before reconnecting",
  );
  expect(await oauth.signOutTeak()).toBe("local-only");
  expect(stores.has(key)).toBe(false);
  expect(posts).toHaveLength(0);
  expect(browserCount).toBe(0);
});

test("background reads join WorkOS reauthorization rotation", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "prior-access",
    refreshToken: "prior-refresh",
    isExpired: () => false,
  });
  let notify = () => {};
  let release = () => {};
  const started = new Promise<void>((resolve) => {
    notify = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  posts.length = 0;
  globalThis.fetch = (async (input, init) => {
    if (String(input).includes("teak-oauth-clients")) {
      notify();
      await held;
    }
    return transport(input, init);
  }) as typeof fetch;
  const renewal = oauth.reauthorizeTeak();
  await started;
  const background = oauth.getStoredTeakAccessToken();
  release();
  expect(await renewal).toBe("access-new");
  expect(await background).toBe("access-new");
  expect(
    posts.filter((post) => post.body.get("grant_type") === "refresh_token"),
  ).toHaveLength(1);
});

test("corrupt registry metadata cannot block valid logout or clear foreign tokens", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  const prefix =
    "teak.oauth.provider:" +
    encodeURIComponent("https://teakvault.com/api/v1") +
    ":";
  const corruptKey = prefix + "corrupt";
  await raycastLocalStorageMock.setItem(corruptKey, "{invalid");
  stores.set("foreign-provider", {
    accessToken: "foreign-secret",
    isExpired: () => false,
  });
  posts.length = 0;
  await expect(oauth.signOutTeak()).rejects.toThrow("metadata");
  expect(stores.has(key)).toBe(false);
  expect(stores.has("foreign-provider")).toBe(true);
  expect(await raycastLocalStorageMock.getItem(corruptKey)).toBeUndefined();
  expect(
    posts.filter((post) => post.url.endsWith("/oauth/disconnect")),
  ).toHaveLength(1);
});
test.each([
  "invalid_grant",
  "invalid_client",
  "unknown",
  "malformed",
  "outage",
  "network",
  "oversized",
])(
  "logout clears definitive grant/client rejection and retains uncertain failures (%s)",
  async (failure) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    stores.set("foreign-provider", {
      accessToken: "foreign-secret",
      isExpired: () => false,
    });
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/oauth/disconnect"))
        return new Response(null, { status: 401 });
      if (String(input).endsWith("/oauth2/token")) {
        if (failure === "network") throw new Error("Network unavailable");
        if (failure === "oversized")
          return json(
            { error: "invalid_grant", extra: "x".repeat(70 * 1024) },
            400,
          );
        if (failure === "malformed") return new Response("{", { status: 400 });
        if (failure === "outage") return json({ error: "invalid_grant" }, 503);
        return json({ error: failure }, 400);
      }
      return transport(input, init);
    }) as typeof fetch;
    if (failure === "invalid_grant" || failure === "invalid_client") {
      expect(await oauth.signOutTeak()).toBe("local-only");
      expect(stores.has(key)).toBe(false);
      globalThis.fetch = transport;
      browserCount = 0;
      await oauth.authorizeTeak();
      expect(browserCount).toBe(1);
    } else {
      await expect(oauth.signOutTeak()).rejects.toThrow(
        "credentials are still saved",
      );
      expect(stores.has(key)).toBe(true);
    }
    expect(stores.has("foreign-provider")).toBe(true);
  },
);

test.each(["invalid_grant", "invalid_refresh_token"])(
  "local-only Sign Out action after %s warns that other installations may remain connected",
  async (refreshError) => {
    await oauth.authorizeTeak();
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/oauth/disconnect"))
        return new Response(null, { status: 401 });
      if (String(input).endsWith("/oauth2/token"))
        return json({ error: refreshError }, 400);
      return transport(input, init);
    }) as typeof fetch;
    const { SignOutAction } = await import("../components/SignOutAction");
    let signedOut = false;
    const action = SignOutAction({
      onSignedOut: () => {
        signedOut = true;
      },
    });
    if (!action) throw new Error("Missing Sign Out action");
    await action.props.onAction();
    expect(toasts).toEqual([
      {
        style: "success",
        title: "Signed out on this Mac",
        message: "Other installations may still be connected.",
      },
    ]);
    expect(signedOut).toBe(true);
    expect(stores.size).toBe(0);
  },
);

test.each([400, 401])(
  "malformed HTTP %i refresh replies preserve credentials without browser replacement",
  async (status) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    const saved = {
      accessToken: "expired",
      refreshToken: "saved-refresh",
      isExpired: () => true,
    };
    stores.set(key, saved);
    for (const body of [
      null,
      "",
      "not-json",
      '{"error":"invalid_request"}',
      "x".repeat(70 * 1024),
    ]) {
      globalThis.fetch = (async (input, init) => {
        if (
          String(input).endsWith("/oauth2/token") &&
          new URLSearchParams(String(init?.body)).get("grant_type") ===
            "refresh_token"
        )
          return new Response(body, { status });
        if (String(input).endsWith("/oauth/disconnect"))
          return new Response(null, { status: 401 });
        return transport(input, init);
      }) as typeof fetch;
      await expect(oauth.getStoredTeakAccessToken()).rejects.toThrow();
      await expect(oauth.authorizeTeak()).rejects.toThrow();
      expect(stores.get(key)).toBe(saved);
      expect(browserCount).toBe(1);
      await expect(oauth.signOutTeak()).rejects.toThrow(
        "credentials are still saved",
      );
      expect(stores.get(key)).toBe(saved);
    }
    await expect(oauth.authorizeTeak()).rejects.toThrow();
    expect(browserCount).toBe(1);
    expect(stores.get(key)).toBe(saved);
  },
);

test("current discovered replacement WorkOS issuer signs out its exact saved namespace", async () => {
  workosIssuer = "https://replacement-teak.authkit.app";
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  browserCount = 0;
  posts.length = 0;
  expect(await oauth.signOutTeak()).toBe("disconnected");
  expect(stores.has(key)).toBe(false);
  expect(posts).toHaveLength(1);
  expect(posts[0].authorization).toBe("Bearer access-new");
  expect(browserCount).toBe(0);
});

test("trusted historical WorkOS 401 clears locally without refreshing against the replacement provider", async () => {
  await oauth.authorizeTeak();
  const key = Array.from(stores.keys())[0];
  stores.set(key, {
    accessToken: "historical-expired",
    refreshToken: "historical-refresh",
    isExpired: () => true,
  });
  workosIssuer = replacementIssuer;
  disconnectStatus = 401;
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
  const restarted = await import(
    `../lib/oauth?historical-mismatch=${crypto.randomUUID()}`
  );
  posts.length = 0;
  browserCount = 0;
  expect(await restarted.signOutTeak()).toBe("local-only");
  expect(stores.has(key)).toBe(false);
  expect(posts).toHaveLength(1);
  expect(posts[0].authorization).toBe("Bearer historical-expired");
  expect(posts[0].body.has("refresh_token")).toBe(false);
  expect(browserCount).toBe(0);
});

test.each([
  ["https://attacker.authkit.app", "client_01M47GV3CYKFW0H78W0XYKGTM5"],
  ["https://scholarly-hay-77.authkit.app", "client_attacker"],
])(
  "untrusted saved WorkOS pin %s never accesses its credential namespace",
  async (issuer, clientId) => {
    const apiBaseUrl = "https://teakvault.com/api/v1";
    const providerId = `teak:${apiBaseUrl}|${issuer}|${clientId}`;
    const key = `teak.oauth.provider:${encodeURIComponent(apiBaseUrl)}:${providerId}`;
    const saved = {
      accessToken: "untouched-access",
      refreshToken: "untouched-refresh",
      isExpired: () => true,
    };
    stores.set(providerId, saved);
    await raycastLocalStorageMock.setItem(
      key,
      JSON.stringify({ apiBaseUrl, issuer, clientId, providerId }),
    );
    await expect(oauth.signOutTeak()).rejects.toThrow("metadata");
    expect(credentialReads).not.toContain(providerId);
    expect(stores.get(providerId)).toBe(saved);
    expect(posts).toHaveLength(0);
    expect(browserCount).toBe(0);
  },
);

test.each([
  [400, "invalid_client"],
  [401, "invalid_client"],
  [400, "unauthorized_client"],
  [401, "unauthorized_client"],
])(
  "refresh HTTP %i %s requires explicit local-only Sign Out",
  async (status, error) => {
    await oauth.authorizeTeak();
    const key = Array.from(stores.keys())[0];
    const saved = {
      accessToken: "expired-client-access",
      refreshToken: "saved-client-refresh",
      isExpired: () => true,
    };
    stores.set(key, saved);
    browserCount = 0;
    globalThis.fetch = (async (input, init) => {
      if (String(input).endsWith("/oauth2/token"))
        return json({ error }, Number(status));
      if (String(input).endsWith("/oauth/disconnect"))
        return new Response(null, { status: 401 });
      return transport(input, init);
    }) as typeof fetch;
    await expect(oauth.getStoredTeakAccessToken()).rejects.toThrow();
    await expect(oauth.authorizeTeak()).rejects.toThrow();
    expect(stores.get(key)).toBe(saved);
    expect(browserCount).toBe(0);
    expect(await oauth.signOutTeak()).toBe("local-only");
    expect(stores.has(key)).toBe(false);
    expect(browserCount).toBe(0);
  },
);
