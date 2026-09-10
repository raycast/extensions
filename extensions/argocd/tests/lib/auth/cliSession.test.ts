import { describe, expect, it, vi } from "vitest";
import { createCliTokenReader, type CliSessionDeps } from "../../../src/lib/auth/cliSession";
import { AuthError } from "../../../src/lib/auth/provider";
import { OidcError } from "../../../src/lib/auth/oidc";
import { RENEW_AHEAD_MS, type SsoSession } from "../../../src/lib/auth/session";
import type { CliToken } from "../../../src/lib/auth/cliConfig";
import type { ArgoInstance } from "../../../src/lib/config/instances";
import type { OidcSettings } from "../../../src/lib/argocd/settings";

const NOW = 1_757_280_000_000;

const INSTANCE: ArgoInstance = {
  id: "i1",
  name: "prod",
  baseUrl: "https://argocd.example.com",
  env: "prod",
  authMode: "cli",
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
  issuer: SETTINGS.issuer,
  authorizationEndpoint: "https://idp.example.com/authorize",
  tokenEndpoint: "https://idp.example.com/token",
  revocationEndpoint: undefined,
};

function cliToken(overrides: Partial<CliToken> = {}): CliToken {
  return {
    token: "config-id-token",
    expiresAt: new Date(NOW + 3600_000),
    refreshToken: "config-refresh-token",
    ...overrides,
  };
}

function cached(overrides: Partial<SsoSession> = {}): SsoSession {
  return {
    idToken: "cached-id-token",
    refreshToken: "config-refresh-token",
    expiresAt: NOW + 3600_000,
    issuer: SETTINGS.issuer,
    clientId: SETTINGS.clientId,
    ...overrides,
  };
}

function deps(overrides: Partial<CliSessionDeps> = {}): CliSessionDeps {
  return {
    readCliToken: vi.fn().mockResolvedValue(cliToken()),
    readCachedSession: vi.fn().mockResolvedValue(undefined),
    writeCachedSession: vi.fn().mockResolvedValue(undefined),
    clearCachedSession: vi.fn().mockResolvedValue(undefined),
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

describe("rule 1: a live config token wins", () => {
  it("returns it with no request at all", async () => {
    const d = deps();
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("config-id-token");
    expect(d.readSettings).not.toHaveBeenCalled();
    expect(d.refresh).not.toHaveBeenCalled();
    expect(d.readCachedSession).not.toHaveBeenCalled();
  });

  it("serves a non-expiring account token, which has no readable expiry", async () => {
    // This is the branch that keeps a hand-written permanent token working forever.
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: undefined, refreshToken: undefined })),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("config-id-token");
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("takes precedence over a cached renewal, so a fresh argocd login applies at once", async () => {
    const d = deps({ readCachedSession: vi.fn().mockResolvedValue(cached()) });
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("config-id-token");
  });
});

describe("rule 2: a live cached renewal wins over a round trip", () => {
  it("returns the cached token when the config one has lapsed", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })),
      readCachedSession: vi.fn().mockResolvedValue(cached()),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("cached-id-token");
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("does not use a cached renewal that has itself lapsed", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })),
      readCachedSession: vi.fn().mockResolvedValue(cached({ expiresAt: NOW - 1 })),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("renewed-id-token");
    expect(d.refresh).toHaveBeenCalled();
  });

  it("renews ahead of expiry rather than at it", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW + RENEW_AHEAD_MS - 1) })),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("renewed-id-token");
  });
});

describe("rule 3: renewal from the config's refresh token", () => {
  const lapsed = () =>
    deps({ readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })) });

  it("uses the refresh token the argocd CLI stored, and the instance's own provider settings", async () => {
    const d = lapsed();
    await expect(createCliTokenReader(d)(INSTANCE)).resolves.toBe("renewed-id-token");
    expect(d.refresh).toHaveBeenCalledWith(ENDPOINTS, "public-client", "config-refresh-token", [
      "openid",
      "groups",
    ]);
    expect(d.readSettings).toHaveBeenCalledWith(INSTANCE);
  });

  it("caches the renewal, so the next command costs no round trip", async () => {
    const d = lapsed();
    await createCliTokenReader(d)(INSTANCE);
    expect(d.writeCachedSession).toHaveBeenCalledWith(
      "i1",
      expect.objectContaining({ idToken: "renewed-id-token" }),
    );
  });

  it("never writes back into the argocd CLI config, which is not ours to rewrite", async () => {
    const d = lapsed();
    await createCliTokenReader(d)(INSTANCE);
    // The only writer in the dependency surface is the extension's own cache.
    expect(Object.keys(d).filter((k) => k.startsWith("write"))).toEqual(["writeCachedSession"]);
  });

  it("asks for a login when the config carries no refresh token", async () => {
    const d = deps({
      readCliToken: vi
        .fn()
        .mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1), refreshToken: undefined })),
    });
    const rejection = createCliTokenReader(d)(INSTANCE);
    await expect(rejection).rejects.toThrowError(AuthError);
    await expect(rejection).rejects.toThrowError(/no refresh token/);
    await expect(rejection).rejects.toThrowError(/argocd login argocd\.example\.com --sso --grpc-web/);
  });

  it("discards the cache and asks for a login when the refresh token is spent", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })),
      refresh: vi.fn().mockRejectedValue(new OidcError("refresh token is invalid", "invalid_grant")),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).rejects.toThrowError(/revoked or expired/);
    expect(d.clearCachedSession).toHaveBeenCalledWith("i1");
  });

  it("keeps the cache on a provider outage, which is worth retrying", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })),
      refresh: vi.fn().mockRejectedValue(new OidcError("the provider is down", "unreachable")),
    });
    await expect(createCliTokenReader(d)(INSTANCE)).rejects.toThrowError(/the provider is down/);
    expect(d.clearCachedSession).not.toHaveBeenCalled();
  });
});

describe("when there is no session at all", () => {
  it("names the exact command to run", async () => {
    const d = deps({ readCliToken: vi.fn().mockResolvedValue(undefined) });
    await expect(createCliTokenReader(d)(INSTANCE)).rejects.toThrowError(
      /No argocd CLI session for argocd\.example\.com/,
    );
  });

  it("looks the session up by host, port included", async () => {
    const readCliToken = vi.fn().mockResolvedValue(cliToken());
    await createCliTokenReader(deps({ readCliToken }))({
      ...INSTANCE,
      baseUrl: "https://argocd.example.com:8443",
    });
    expect(readCliToken).toHaveBeenCalledWith("argocd.example.com:8443");
  });
});

describe("secret hygiene", () => {
  it("never puts a token in an error message", async () => {
    const d = deps({
      readCliToken: vi.fn().mockResolvedValue(cliToken({ expiresAt: new Date(NOW - 1) })),
      refresh: vi.fn().mockRejectedValue(new OidcError("nope", "invalid_grant")),
    });
    await createCliTokenReader(d)(INSTANCE).catch((error: Error) => {
      expect(error.message).not.toContain("config-refresh-token");
      expect(error.message).not.toContain("config-id-token");
    });
    expect.assertions(2);
  });
});
