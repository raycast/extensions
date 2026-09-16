import { describe, expect, it, vi } from "vitest";
import {
  OidcError,
  PublicClientRequiredError,
  base64Url,
  buildAuthorizeUrl,
  createPkce,
  decodeExpiry,
  discover,
  exchangeCode,
  parseCallback,
  refreshTokens,
  withOfflineAccess,
} from "../../../src/lib/auth/oidc";

const ENDPOINTS = {
  issuer: "https://idp.example.com",
  authorizationEndpoint: "https://idp.example.com/oauth2/v1/authorize",
  tokenEndpoint: "https://idp.example.com/oauth2/v1/token",
  revocationEndpoint: undefined,
};

/** A syntactically valid JWT with no signature, so no real token is ever committed. */
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.c2ln`;
}

interface Recorded {
  url: string;
  init: RequestInit;
}

function stubFetch(responses: (() => Response)[], calls: Recorded[] = []) {
  let index = 0;
  const fetchStub = vi.fn(async (input: string | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    const next = responses[Math.min(index++, responses.length - 1)];
    if (!next) {
      throw new Error("no stubbed response");
    }
    return next();
  });
  return { calls, fetchStub: fetchStub as unknown as typeof globalThis.fetch };
}

const NOW = 1_757_280_000_000;
const deps = (fetchStub: typeof globalThis.fetch) => ({ fetch: fetchStub, now: () => NOW });

describe("discover", () => {
  const metadata = {
    issuer: "https://idp.example.com",
    authorization_endpoint: "https://idp.example.com/oauth2/v1/authorize",
    token_endpoint: "https://idp.example.com/oauth2/v1/token",
    revocation_endpoint: "https://idp.example.com/oauth2/v1/revoke",
  };

  it("reads the endpoints from the well-known document", async () => {
    const { calls, fetchStub } = stubFetch([() => Response.json(metadata)]);
    await expect(discover("https://idp.example.com", { fetch: fetchStub })).resolves.toEqual({
      issuer: "https://idp.example.com",
      authorizationEndpoint: "https://idp.example.com/oauth2/v1/authorize",
      tokenEndpoint: "https://idp.example.com/oauth2/v1/token",
      revocationEndpoint: "https://idp.example.com/oauth2/v1/revoke",
    });
    expect(calls[0]?.url).toBe("https://idp.example.com/.well-known/openid-configuration");
  });

  it("tolerates a trailing slash on the issuer", async () => {
    const { calls, fetchStub } = stubFetch([() => Response.json(metadata)]);
    await discover("https://idp.example.com/", { fetch: fetchStub });
    expect(calls[0]?.url).toBe("https://idp.example.com/.well-known/openid-configuration");
  });

  it("fails clearly when the provider cannot be reached", async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(discover("https://idp.example.com", { fetch: fetchStub })).rejects.toThrowError(/Could not reach/);
  });

  it("fails when the metadata has no endpoints", async () => {
    const { fetchStub } = stubFetch([() => Response.json({ issuer: "https://idp.example.com" })]);
    await expect(discover("https://idp.example.com", { fetch: fetchStub })).rejects.toThrowError(
      /no authorization or token endpoint/,
    );
  });

  it("fails on a non-2xx and on a body that is not JSON", async () => {
    const { fetchStub: notFound } = stubFetch([() => new Response("", { status: 404 })]);
    await expect(discover("https://idp.example.com", { fetch: notFound })).rejects.toThrowError(/404/);

    const { fetchStub: notJson } = stubFetch([() => new Response("<html>", { status: 200 })]);
    await expect(discover("https://idp.example.com", { fetch: notJson })).rejects.toThrowError(/not return JSON/);
  });
});

describe("createPkce", () => {
  it("derives the challenge from the verifier with S256, base64url encoded", () => {
    const randomBytes = () => new Uint8Array(32).fill(7);
    const sha256 = vi.fn(() => new Uint8Array(32).fill(9));
    const pkce = createPkce({ randomBytes, sha256 });

    expect(pkce.verifier).toBe(base64Url(new Uint8Array(32).fill(7)));
    expect(pkce.challenge).toBe(base64Url(new Uint8Array(32).fill(9)));
    expect(sha256).toHaveBeenCalledWith(pkce.verifier);
  });

  it("asks for the 32 bytes of entropy RFC 7636 recommends", () => {
    const randomBytes = vi.fn((length: number) => new Uint8Array(length));
    createPkce({ randomBytes, sha256: () => new Uint8Array(32) });
    expect(randomBytes).toHaveBeenCalledWith(32);
  });

  it("produces url-safe values, so nothing needs escaping on the wire", () => {
    const pkce = createPkce({
      randomBytes: (length) => new Uint8Array(Array.from({ length }, (_, i) => i * 7)),
      sha256: () => new Uint8Array(Array.from({ length: 32 }, (_, i) => 255 - i)),
    });
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pkce.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("withOfflineAccess", () => {
  it("adds offline_access, which is what makes a refresh token appear", () => {
    expect(withOfflineAccess(["openid", "profile"])).toEqual(["openid", "profile", "offline_access"]);
  });

  it("does not duplicate it", () => {
    expect(withOfflineAccess(["openid", "offline_access"])).toEqual(["openid", "offline_access"]);
  });

  it("adds openid, without which there is no id token to use as a bearer", () => {
    expect(withOfflineAccess(["email"])).toEqual(["openid", "email", "offline_access"]);
  });

  it("falls back to a usable set when the instance reports none", () => {
    expect(withOfflineAccess([])).toEqual(["openid", "profile", "email", "groups", "offline_access"]);
  });
});

describe("buildAuthorizeUrl", () => {
  const options = {
    endpoints: ENDPOINTS,
    clientId: "public-client",
    redirectUri: "http://127.0.0.1:8085/auth/callback",
    scopes: ["openid", "groups"],
    pkce: { verifier: "the-verifier", challenge: "the-challenge" },
    state: "the-state",
  };

  it("builds an authorization code request with PKCE", () => {
    const url = new URL(buildAuthorizeUrl(options));
    expect(url.origin + url.pathname).toBe("https://idp.example.com/oauth2/v1/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "public-client",
      response_type: "code",
      redirect_uri: "http://127.0.0.1:8085/auth/callback",
      scope: "openid groups offline_access",
      state: "the-state",
      code_challenge: "the-challenge",
      code_challenge_method: "S256",
    });
  });

  it("never puts the verifier in the authorization request", () => {
    expect(buildAuthorizeUrl(options)).not.toContain("the-verifier");
  });

  it("keeps a query string the provider already had on its endpoint", () => {
    const url = new URL(
      buildAuthorizeUrl({
        ...options,
        endpoints: { authorizationEndpoint: "https://idp.example.com/authorize?idp=corp" },
      }),
    );
    expect(url.searchParams.get("idp")).toBe("corp");
    expect(url.searchParams.get("client_id")).toBe("public-client");
  });
});

describe("parseCallback", () => {
  it("reads the code and the state", () => {
    expect(parseCallback("/auth/callback?code=abc&state=xyz")).toEqual({ code: "abc", state: "xyz" });
  });

  it("accepts an absolute url as well as a request path", () => {
    expect(parseCallback("http://127.0.0.1:8085/auth/callback?code=abc&state=xyz").code).toBe("abc");
  });

  it("surfaces the provider's error with its description, which is the actionable part", () => {
    expect(() =>
      parseCallback("/auth/callback?error=invalid_request&error_description=redirect_uri%20not%20registered"),
    ).toThrowError(/invalid_request: redirect_uri not registered/);
  });

  it("fails when there is no code", () => {
    expect(() => parseCallback("/auth/callback?state=xyz")).toThrowError(/no authorization code/);
    expect(() => parseCallback("/auth/callback")).toThrowError(OidcError);
  });
});

describe("decodeExpiry", () => {
  it("reads the exp claim in milliseconds", () => {
    expect(decodeExpiry(fakeJwt({ exp: 1_757_280_000 }))).toBe(1_757_280_000_000);
  });

  it("returns undefined for an opaque or malformed token", () => {
    expect(decodeExpiry("opaque")).toBeUndefined();
    expect(decodeExpiry("a.b.c")).toBeUndefined();
    expect(decodeExpiry(fakeJwt({ sub: "someone" }))).toBeUndefined();
    expect(decodeExpiry(fakeJwt({ exp: "soon" }))).toBeUndefined();
  });
});

describe("exchangeCode", () => {
  const options = {
    endpoints: ENDPOINTS,
    clientId: "public-client",
    redirectUri: "http://127.0.0.1:8085/auth/callback",
    code: "the-code",
    verifier: "the-verifier",
  };

  it("posts the code and the verifier, with no client secret", async () => {
    const idToken = fakeJwt({ exp: NOW / 1000 + 3600 });
    const { calls, fetchStub } = stubFetch([
      () => Response.json({ id_token: idToken, refresh_token: "the-refresh", expires_in: 3600 }),
    ]);

    const tokens = await exchangeCode(options, deps(fetchStub));
    expect(tokens).toEqual({ idToken, refreshToken: "the-refresh", expiresAt: NOW + 3600_000 });

    const body = new URLSearchParams(String(calls[0]?.init.body));
    expect(Object.fromEntries(body)).toEqual({
      grant_type: "authorization_code",
      client_id: "public-client",
      redirect_uri: "http://127.0.0.1:8085/auth/callback",
      code: "the-code",
      code_verifier: "the-verifier",
    });
    expect(body.has("client_secret")).toBe(false);
  });

  it("prefers the exp claim over expires_in, which is relative to a clock we do not share", async () => {
    const idToken = fakeJwt({ exp: 2_000_000_000 });
    const { fetchStub } = stubFetch([() => Response.json({ id_token: idToken, expires_in: 60 })]);
    await expect(exchangeCode(options, deps(fetchStub))).resolves.toMatchObject({
      expiresAt: 2_000_000_000_000,
    });
  });

  it("falls back to expires_in for an opaque token", async () => {
    const { fetchStub } = stubFetch([() => Response.json({ id_token: "opaque", expires_in: 120 })]);
    await expect(exchangeCode(options, deps(fetchStub))).resolves.toMatchObject({
      expiresAt: NOW + 120_000,
    });
  });

  it("leaves the expiry unknown when the provider says nothing about it", async () => {
    const { fetchStub } = stubFetch([() => Response.json({ id_token: "opaque" })]);
    await expect(exchangeCode(options, deps(fetchStub))).resolves.toMatchObject({ expiresAt: undefined });
  });

  it("reports a confidential client as the configuration problem it is", async () => {
    const { fetchStub } = stubFetch([
      () => Response.json({ error: "invalid_client", error_description: "auth failed" }, { status: 401 }),
    ]);
    const rejection = exchangeCode(options, deps(fetchStub));
    await expect(rejection).rejects.toThrowError(PublicClientRequiredError);
    await expect(rejection).rejects.toThrowError(/oidc\.cliClientID/);
  });

  it("surfaces any other provider error description", async () => {
    const { fetchStub } = stubFetch([
      () => Response.json({ error: "invalid_grant", error_description: "code already used" }, { status: 400 }),
    ]);
    await expect(exchangeCode(options, deps(fetchStub))).rejects.toThrowError(/code already used/);
  });

  it("fails when there is no id token, since that is what ArgoCD accepts", async () => {
    const { fetchStub } = stubFetch([() => Response.json({ access_token: "not-what-argocd-wants" })]);
    await expect(exchangeCode(options, deps(fetchStub))).rejects.toThrowError(/no id token/);
  });

  it("reports an unreachable token endpoint", async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    await expect(exchangeCode(options, deps(fetchStub))).rejects.toThrowError(/Could not reach/);
  });
});

describe("refreshTokens", () => {
  const options = {
    endpoints: ENDPOINTS,
    clientId: "public-client",
    refreshToken: "the-refresh",
    scopes: ["openid", "groups"],
  };

  it("exchanges the refresh token with no secret and no user interaction", async () => {
    const idToken = fakeJwt({ exp: NOW / 1000 + 3600 });
    const { calls, fetchStub } = stubFetch([() => Response.json({ id_token: idToken })]);

    await expect(refreshTokens(options, deps(fetchStub))).resolves.toMatchObject({ idToken });
    expect(Object.fromEntries(new URLSearchParams(String(calls[0]?.init.body)))).toEqual({
      grant_type: "refresh_token",
      client_id: "public-client",
      refresh_token: "the-refresh",
      scope: "openid groups offline_access",
    });
  });

  it("keeps the existing refresh token when the provider does not rotate it", async () => {
    const { fetchStub } = stubFetch([() => Response.json({ id_token: fakeJwt({ exp: 2_000_000_000 }) })]);
    await expect(refreshTokens(options, deps(fetchStub))).resolves.toMatchObject({
      refreshToken: "the-refresh",
    });
  });

  it("takes the rotated refresh token when the provider returns one", async () => {
    const { fetchStub } = stubFetch([
      () => Response.json({ id_token: fakeJwt({ exp: 2_000_000_000 }), refresh_token: "rotated" }),
    ]);
    await expect(refreshTokens(options, deps(fetchStub))).resolves.toMatchObject({
      refreshToken: "rotated",
    });
  });

  it("surfaces an expired or revoked refresh token, which needs a new login", async () => {
    const { fetchStub } = stubFetch([
      () => Response.json({ error: "invalid_grant", error_description: "refresh token is invalid" }, { status: 400 }),
    ]);
    await expect(refreshTokens(options, deps(fetchStub))).rejects.toThrowError(/refresh token is invalid/);
  });
});

describe("the callback page cannot be injected into", () => {
  it("escapes provider-supplied text, which parseCallback puts in the error message", async () => {
    // The provider chooses error_description, and it arrives via a redirect to a predictable
    // loopback URL. Interpolating it raw made the completion page an injection point.
    const { escapeHtml } = await import("../../../src/lib/auth/oidc");
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(escapeHtml(`" onload="x`)).toBe("&quot; onload=&quot;x");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes the ampersand first, so an escape cannot be double-encoded into a tag", () => {
    // &lt; must not become &amp;lt; -- order matters and a later reorder would break it.
    return import("../../../src/lib/auth/oidc").then(({ escapeHtml }) => {
      expect(escapeHtml("&lt;script&gt;")).toBe("&amp;lt;script&amp;gt;");
    });
  });
});
