import { describe, expect, it } from "vitest";
import {
  RENEW_AHEAD_MS,
  isExpired,
  matchesProvider,
  mergeRenewal,
  needsLogin,
  needsRenewal,
  parseSession,
  serializeSession,
  sessionFromTokens,
  type SsoSession,
} from "../../../src/lib/auth/session";

const NOW = 1_757_280_000_000;

function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.c2ln`;
}

function session(overrides: Partial<SsoSession> = {}): SsoSession {
  return {
    idToken: "the-id-token",
    refreshToken: "the-refresh-token",
    expiresAt: NOW + 3600_000,
    issuer: "https://idp.example.com",
    clientId: "public-client",
    ...overrides,
  };
}

describe("sessionFromTokens", () => {
  it("keeps the provider identity, so a session cannot outlive a reconfiguration", () => {
    const built = sessionFromTokens(
      { idToken: "t", refreshToken: "r", expiresAt: NOW },
      "https://idp.example.com",
      "public-client",
    );
    expect(built).toMatchObject({ issuer: "https://idp.example.com", clientId: "public-client" });
  });

  it("falls back to the token's own exp claim when the exchange reported none", () => {
    const idToken = fakeJwt({ exp: 2_000_000_000 });
    expect(
      sessionFromTokens({ idToken, refreshToken: undefined, expiresAt: undefined }, "i", "c").expiresAt,
    ).toBe(2_000_000_000_000);
  });
});

describe("mergeRenewal", () => {
  it("replaces the id token and keeps the rest", () => {
    const merged = mergeRenewal(session(), { idToken: "new", refreshToken: undefined, expiresAt: NOW + 1 });
    expect(merged).toMatchObject({
      idToken: "new",
      refreshToken: "the-refresh-token",
      expiresAt: NOW + 1,
      issuer: "https://idp.example.com",
    });
  });

  it("takes a rotated refresh token", () => {
    expect(
      mergeRenewal(session(), { idToken: "new", refreshToken: "rotated", expiresAt: NOW }).refreshToken,
    ).toBe("rotated");
  });
});

describe("needsRenewal", () => {
  it("renews ahead of expiry, so a request is never sent with a lapsing token", () => {
    expect(needsRenewal(session({ expiresAt: NOW + RENEW_AHEAD_MS - 1 }), NOW)).toBe(true);
    expect(needsRenewal(session({ expiresAt: NOW + RENEW_AHEAD_MS + 1 }), NOW)).toBe(false);
  });

  it("renews an already expired session", () => {
    expect(needsRenewal(session({ expiresAt: NOW - 1 }), NOW)).toBe(true);
  });

  it("leaves an unknown expiry alone, since the server remains the authority", () => {
    expect(needsRenewal(session({ expiresAt: undefined }), NOW)).toBe(false);
  });

  it("honours an explicit lead time", () => {
    expect(needsRenewal(session({ expiresAt: NOW + 600_000 }), NOW, 900_000)).toBe(true);
  });
});

describe("isExpired", () => {
  it("is true from the expiry instant onwards", () => {
    expect(isExpired(session({ expiresAt: NOW }), NOW)).toBe(true);
    expect(isExpired(session({ expiresAt: NOW + 1 }), NOW)).toBe(false);
    expect(isExpired(session({ expiresAt: undefined }), NOW)).toBe(false);
  });
});

describe("needsLogin", () => {
  it("is true with no session at all", () => {
    expect(needsLogin(undefined, NOW)).toBe(true);
  });

  it("is false while a refresh token exists, however stale the id token is", () => {
    // This is the whole point: an expired id token is not a reason to bother anyone.
    expect(needsLogin(session({ expiresAt: NOW - 3600_000 }), NOW)).toBe(false);
  });

  it("is true for an expired session with no refresh token", () => {
    expect(needsLogin(session({ refreshToken: undefined, expiresAt: NOW - 1 }), NOW)).toBe(true);
  });

  it("is false for a live session with no refresh token", () => {
    expect(needsLogin(session({ refreshToken: undefined, expiresAt: NOW + 1000 }), NOW)).toBe(false);
  });
});

describe("matchesProvider", () => {
  it("rejects a session minted against another issuer or client", () => {
    expect(matchesProvider(session(), "https://idp.example.com", "public-client")).toBe(true);
    expect(matchesProvider(session(), "https://other.example.com", "public-client")).toBe(false);
    expect(matchesProvider(session(), "https://idp.example.com", "another-client")).toBe(false);
  });
});

describe("serialization", () => {
  it("round-trips", () => {
    expect(parseSession(serializeSession(session()))).toEqual(session());
  });

  it("never emits a line break, which the secret write refuses", () => {
    expect(serializeSession(session())).not.toMatch(/[\r\n]/);
  });

  it("discards anything without an id token rather than repairing it", () => {
    expect(parseSession(undefined)).toBeUndefined();
    expect(parseSession("")).toBeUndefined();
    expect(parseSession("{bad json")).toBeUndefined();
    expect(parseSession("[]")).toBeUndefined();
    expect(parseSession(JSON.stringify({ refreshToken: "r" }))).toBeUndefined();
    expect(parseSession(JSON.stringify({ idToken: "" }))).toBeUndefined();
  });

  it("recovers the expiry from the token when the stored value is missing", () => {
    const idToken = fakeJwt({ exp: 2_000_000_000 });
    expect(parseSession(JSON.stringify({ idToken }))?.expiresAt).toBe(2_000_000_000_000);
  });
});
