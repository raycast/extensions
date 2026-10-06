import { afterEach, beforeEach, expect, mock, test } from "bun:test";

interface Tokens {
  accessToken: string;
  isExpired: () => boolean;
  refreshToken?: string;
}
const stores = new Map<string, Tokens>();
const requests: Array<{
  endpoint: string;
  clientId: string;
  scope: string;
  extraParameters: Record<string, string>;
}> = [];
let browserCount = 0;
let mode: "betterauth" | "workos" = "betterauth";
let tokenFailure = false;
let malformedToken = false;
let revocationFailure = false;
const posts: Array<{
  url: string;
  body: URLSearchParams;
  redirect: RequestRedirect | undefined;
}> = [];
const originalFetch = globalThis.fetch;

mock.module("@raycast/api", () => ({
  environment: { isDevelopment: false },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      private readonly options: { providerId: string };
      constructor(options: { providerId: string }) {
        this.options = options;
      }
      getTokens() {
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
          codeVerifier: "native-verifier",
          redirectURI: "https://raycast.com/redirect?package=teak-raycast",
        });
      }
      authorize() {
        browserCount += 1;
        return Promise.resolve({ authorizationCode: "native-code" });
      }
    },
  },
}));
const oauth = await import(`../lib/oauth?oauth-tests=${crypto.randomUUID()}`);
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const transport = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const issuer =
    mode === "betterauth"
      ? "https://app.teakvault.com"
      : "https://api.workos.com";
  const client = mode === "betterauth" ? "teak-raycast" : "client_raycast_dev";
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
        primary: mode,
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
        token_endpoint: `${issuer}/token`,
        revocation_endpoint: `${issuer}/revoke`,
      }),
    );
  }
  posts.push({
    url,
    body: new URLSearchParams(String(init?.body)),
    redirect: init?.redirect,
  });
  if (url.endsWith("/revoke")) {
    return Promise.resolve(json({}, revocationFailure ? 503 : 200));
  }
  if (malformedToken) {
    return Promise.resolve(
      new Response("invalid provider response", { status: 200 }),
    );
  }
  return Promise.resolve(
    json(
      {
        access_token: "access-new",
        refresh_token: "refresh-new",
        expires_in: 300,
      },
      tokenFailure ? 401 : 200,
    ),
  );
}) as typeof fetch;
beforeEach(() => {
  stores.clear();
  requests.length = 0;
  posts.length = 0;
  browserCount = 0;
  mode = "betterauth";
  tokenFailure = false;
  malformedToken = false;
  revocationFailure = false;
  // A fresh transport identity gives each scenario a fresh canonical SDK cache.
  globalThis.fetch = ((input, init) => transport(input, init)) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Better Auth discovers browser endpoints and preserves production native credentials", async () => {
  stores.set("teak", {
    accessToken: "legacy",
    refreshToken: "refresh",
    isExpired: () => false,
  });
  expect(await oauth.authorizeTeak()).toBe("legacy");
  expect(browserCount).toBe(0);
});

test("WorkOS binds PKCE and token exchange to the REST resource and dynamic client", async () => {
  mode = "workos";
  expect(await oauth.authorizeTeak()).toBe("access-new");
  expect(requests[0].endpoint).toBe("https://api.workos.com/authorize");
  expect(requests[0].clientId).toBe("client_raycast_dev");
  expect(requests[0].scope).toBe("openid profile email offline_access");
  expect(requests[0].extraParameters.resource).toBe(
    "https://teakvault.com/api",
  );
  expect(posts[0].body.get("resource")).toBe("https://teakvault.com/api");
  expect(posts[0].body.get("code_verifier")).toBe("native-verifier");
  expect(posts[0].body.get("redirect_uri")).toBe(
    "https://raycast.com/redirect?package=teak-raycast",
  );
  expect(posts[0].redirect).toBe("error");
  expect(stores.get("teak")).toBeUndefined();
});

test("concurrent commands rotate a refresh token once without opening the browser", async () => {
  mode = "workos";
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

test("failed refresh refetches mode and never sends the old token to a new issuer", async () => {
  stores.set("teak", {
    accessToken: "expired",
    refreshToken: "old-provider",
    isExpired: () => true,
  });
  const firstTransport = globalThis.fetch;
  globalThis.fetch = ((input, init) => {
    if (String(input).endsWith("/token")) {
      mode = "workos";
      tokenFailure = true;
    }
    return firstTransport(input, init);
  }) as typeof fetch;
  expect(await oauth.getStoredTeakAccessToken()).toBeNull();
  expect(await oauth.hasStoredTeakSession()).toBe(false);
  expect(posts.map((post) => post.url)).toEqual([
    "https://app.teakvault.com/token",
  ]);
  expect(browserCount).toBe(0);
});

test("sign out revokes the rotated credential and retains it on provider failure", async () => {
  mode = "workos";
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
  expect(posts.at(-1)?.body.get("token")).toBe("refresh-new");
  expect(posts.at(-1)?.body.get("client_id")).toBe("client_raycast_dev");
  expect(stores.size).toBe(0);
});

test("non-JSON token replies produce the sign-in error and store no credentials", async () => {
  malformedToken = true;
  await expect(oauth.authorizeTeak()).rejects.toThrow(
    "Invalid Teak sign-in response.",
  );
  expect(stores.size).toBe(0);
});
