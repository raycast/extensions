import { describe, expect, it, vi } from "vitest";
import { createSsoTokenReader, type SsoDeps } from "../../../src/lib/auth/sso";
import { AuthError } from "../../../src/lib/auth/provider";
import { OidcError } from "../../../src/lib/auth/oidc";
import { RENEW_AHEAD_MS, type SsoSession } from "../../../src/lib/auth/session";
import type { ArgoInstance } from "../../../src/lib/config/instances";
import type { OidcSettings } from "../../../src/lib/argocd/settings";

const NOW = 1_757_280_000_000;

const INSTANCE: ArgoInstance = {
  id: "i1",
  name: "prod",
  baseUrl: "https://argocd.example.com",
  env: "prod",
  authMode: "sso",
  allowWrite: false,
  enabled: true,
};

const SETTINGS: OidcSettings = {
  issuer: "https://idp.example.com",
  clientId: "public-client",
  usesCliClient: true,
  scopes: ["openid", "groups"],
  pkceEnabled: true,
  providerName: "Corp SSO",
};

const ENDPOINTS = {
  issuer: "https://idp.example.com",
  authorizationEndpoint: "https://idp.example.com/authorize",
  tokenEndpoint: "https://idp.example.com/token",
  revocationEndpoint: undefined,
};

function session(overrides: Partial<SsoSession> = {}): SsoSession {
  return {
    idToken: "live-id-token",
    refreshToken: "the-refresh-token",
    expiresAt: NOW + 3600_000,
    issuer: SETTINGS.issuer,
    clientId: SETTINGS.clientId,
    ...overrides,
  };
}

function deps(overrides: Partial<SsoDeps> = {}): SsoDeps {
  return {
    readSession: vi.fn().mockResolvedValue(session()),
    writeSession: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn().mockResolvedValue(undefined),
    readSettings: vi.fn().mockResolvedValue(SETTINGS),
    discover: vi.fn().mockResolvedValue(ENDPOINTS),
    refresh: vi.fn().mockResolvedValue({
      idToken: "renewed-id-token",
      refreshToken: undefined,
      expiresAt: NOW + 3600_000,
    }),
    now: () => NOW,
    ...overrides,
  };
}

describe("the common path costs nothing", () => {
  it("returns a live session without any request at all", async () => {
    const d = deps();
    await expect(createSsoTokenReader(d)(INSTANCE)).resolves.toBe("live-id-token");
    expect(d.readSettings).not.toHaveBeenCalled();
    expect(d.discover).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
    expect(d.writeSession).not.toHaveBeenCalled();
  });

  it("does not renew a session with an unknown expiry, leaving the server as the authority", async () => {
    const d = deps({ readSession: vi.fn().mockResolvedValue(session({ expiresAt: undefined })) });
    await expect(createSsoTokenReader(d)(INSTANCE)).resolves.toBe("live-id-token");
    expect(d.refresh).not.toHaveBeenCalled();
  });
});

describe("renewal is silent", () => {
  it("renews ahead of expiry and returns the new token, asking the operator nothing", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW + RENEW_AHEAD_MS - 1 })),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).resolves.toBe("renewed-id-token");
    expect(d.refresh).toHaveBeenCalledWith(ENDPOINTS, "public-client", "the-refresh-token", [
      "openid",
      "groups",
    ]);
  });

  it("renews an already expired session, which is the whole point of the refresh token", async () => {
    const d = deps({ readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 86_400_000 })) });
    await expect(createSsoTokenReader(d)(INSTANCE)).resolves.toBe("renewed-id-token");
  });

  it("stores the renewed session, so the next command starts from it", async () => {
    const d = deps({ readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })) });
    await createSsoTokenReader(d)(INSTANCE);
    expect(d.writeSession).toHaveBeenCalledWith(
      "i1",
      expect.objectContaining({ idToken: "renewed-id-token" }),
    );
  });

  it("keeps the existing refresh token when the provider does not rotate it", async () => {
    const d = deps({ readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })) });
    await createSsoTokenReader(d)(INSTANCE);
    expect(d.writeSession).toHaveBeenCalledWith(
      "i1",
      expect.objectContaining({ refreshToken: "the-refresh-token" }),
    );
  });

  it("stores a rotated refresh token", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })),
      refresh: vi.fn().mockResolvedValue({
        idToken: "renewed-id-token",
        refreshToken: "rotated",
        expiresAt: NOW + 3600_000,
      }),
    });
    await createSsoTokenReader(d)(INSTANCE);
    expect(d.writeSession).toHaveBeenCalledWith("i1", expect.objectContaining({ refreshToken: "rotated" }));
  });

  it("reads the client from the instance rather than holding any provider config", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })),
      readSettings: vi.fn().mockResolvedValue({ ...SETTINGS, clientId: "public-client" }),
    });
    await createSsoTokenReader(d)(INSTANCE);
    expect(d.readSettings).toHaveBeenCalledWith(INSTANCE);
    expect(d.discover).toHaveBeenCalledWith("https://idp.example.com");
  });
});

describe("when a login really is needed", () => {
  it("asks for one when no session was ever stored", async () => {
    const d = deps({ readSession: vi.fn().mockResolvedValue(undefined) });
    const rejection = createSsoTokenReader(d)(INSTANCE);
    await expect(rejection).rejects.toThrowError(AuthError);
    await expect(rejection).rejects.toThrowError(/no single sign-on session yet/);
    await expect(rejection).rejects.toThrowError(/argocd\.example\.com/);
  });

  it("asks for one when an expired session carries no refresh token", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ refreshToken: undefined, expiresAt: NOW - 1 })),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).rejects.toThrowError(/no refresh token/);
  });

  it("discards a spent refresh token, so the same failure is not retried on every request", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })),
      refresh: vi.fn().mockRejectedValue(new OidcError("refresh token is invalid", "invalid_grant")),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).rejects.toThrowError(/revoked or has expired/);
    expect(d.clearSession).toHaveBeenCalledWith("i1");
  });

  it("keeps the session on a provider outage, since it is worth retrying", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })),
      refresh: vi.fn().mockRejectedValue(new OidcError("the provider is down", "unreachable")),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).rejects.toThrowError(/the provider is down/);
    expect(d.clearSession).not.toHaveBeenCalled();
  });

  it("voids a session minted against another provider rather than producing a puzzling 401", async () => {
    const d = deps({
      readSession: vi
        .fn()
        .mockResolvedValue(session({ expiresAt: NOW - 1, issuer: "https://old.example.com" })),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).rejects.toThrowError(/different identity provider/);
    expect(d.clearSession).toHaveBeenCalledWith("i1");
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("voids a session minted against another client", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1, clientId: "old-client" })),
    });
    await expect(createSsoTokenReader(d)(INSTANCE)).rejects.toThrowError(/different identity provider/);
  });
});

describe("secret hygiene", () => {
  it("never puts a token in an error message", async () => {
    const d = deps({
      readSession: vi.fn().mockResolvedValue(session({ expiresAt: NOW - 1 })),
      refresh: vi.fn().mockRejectedValue(new OidcError("nope", "invalid_grant")),
    });
    await createSsoTokenReader(d)(INSTANCE).catch((error: Error) => {
      expect(error.message).not.toContain("the-refresh-token");
      expect(error.message).not.toContain("live-id-token");
    });
    expect.assertions(2);
  });
});
