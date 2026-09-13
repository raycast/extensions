import { describe, expect, it } from "vitest";
import {
  RENEW_AHEAD_MS,
  SESSION_FIELDS,
  isExpired,
  matchesProvider,
  matchesServer,
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
    expect(sessionFromTokens({ idToken, refreshToken: undefined, expiresAt: undefined }, "i", "c").expiresAt).toBe(
      2_000_000_000_000,
    );
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
    expect(mergeRenewal(session(), { idToken: "new", refreshToken: "rotated", expiresAt: NOW }).refreshToken).toBe(
      "rotated",
    );
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

describe("a session records the server it was minted for", () => {
  const base: SsoSession = {
    idToken: "t",
    refreshToken: "r",
    expiresAt: undefined,
    issuer: "https://idp.example.com",
    clientId: "c",
  };

  it("matches the server it was minted for", () => {
    expect(matchesServer({ ...base, baseUrl: "https://a.example.com" }, "https://a.example.com")).toBe(true);
  });

  it("does not match another server, which is what makes an edit detectable with no request", () => {
    expect(matchesServer({ ...base, baseUrl: "https://a.example.com" }, "https://b.example.com")).toBe(false);
  });

  it("leaves a session stored before the field existed alone, since unknown is not grounds to void", () => {
    expect(matchesServer(base, "https://anything.example.com")).toBe(true);
  });

  it("is stamped by sessionFromTokens and by a renewal", () => {
    const tokens = { idToken: "x", refreshToken: undefined, expiresAt: 1 };
    expect(sessionFromTokens(tokens, "i", "c", "https://a.example.com").baseUrl).toBe("https://a.example.com");
    expect(mergeRenewal(base, tokens, "https://a.example.com").baseUrl).toBe("https://a.example.com");
  });

  it("omits the field rather than storing undefined when no server is given", () => {
    const session = sessionFromTokens({ idToken: "x", refreshToken: undefined, expiresAt: 1 }, "i", "c");
    expect("baseUrl" in session).toBe(false);
  });
});

describe("a session survives storage intact", () => {
  const full: SsoSession = {
    idToken: "the-id-token",
    refreshToken: "the-refresh-token",
    expiresAt: 1_757_280_000_000,
    issuer: "https://idp.example.com",
    clientId: "public-client",
    baseUrl: "https://argocd.example.com",
  };

  it("round-trips every field, which is what parseSession dropped baseUrl by failing to do", () => {
    expect(parseSession(serializeSession(full))).toEqual(full);
  });

  it("keeps the server binding usable after the round trip, not just in memory", () => {
    const restored = parseSession(serializeSession(full));
    expect(restored).toBeDefined();
    expect(matchesServer(restored as SsoSession, "https://argocd.example.com")).toBe(true);
    expect(matchesServer(restored as SsoSession, "https://other.example.com")).toBe(false);
  });

  it("covers every declared field, so the next one added cannot be silently dropped", () => {
    // The failure this guards against: a field reaches the interface and the readers, its
    // checks are tested in memory, and the parser never learns about it.
    for (const field of SESSION_FIELDS) {
      expect(Object.keys(full)).toContain(field);
    }
    const restored = parseSession(serializeSession(full)) as unknown as Record<string, unknown>;
    const expected = full as unknown as Record<string, unknown>;
    for (const field of SESSION_FIELDS) {
      expect({ field, value: restored[field] }).toEqual({ field, value: expected[field] });
    }
  });

  it("omits an absent binding rather than storing null, keeping unknown distinguishable", () => {
    const { baseUrl: _omitted, ...legacy } = full;
    const restored = parseSession(JSON.stringify(legacy));
    expect(restored && "baseUrl" in restored).toBe(false);
    expect(matchesServer(restored as SsoSession, "https://anything.example.com")).toBe(true);
  });

  it("ignores a binding that is not a usable string", () => {
    for (const bad of [42, "", null, {}]) {
      const restored = parseSession(JSON.stringify({ ...full, baseUrl: bad }));
      expect(restored && "baseUrl" in restored).toBe(false);
    }
  });
});
