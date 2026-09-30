import { describe, expect, it, vi } from "vitest";
import { AuthError, createTokenProvider, type TokenProviderDeps } from "../../../src/lib/auth/provider";
import type { ArgoInstance } from "../../../src/lib/config/instances";

const SECRET = "the-bearer-value";
const NOW = new Date("2026-09-08T10:00:00Z");

function instance(overrides: Partial<ArgoInstance> = {}): ArgoInstance {
  return {
    id: "i1",
    name: "dev",
    baseUrl: "https://argocd.example.com",
    env: "dev",
    authMode: "cli",
    allowWrite: false,
    enabled: true,
    ...overrides,
  };
}

function deps(overrides: Partial<TokenProviderDeps> = {}): TokenProviderDeps {
  return {
    readCliToken: vi.fn().mockResolvedValue(undefined),
    readStoredToken: vi.fn().mockResolvedValue(undefined),
    now: () => NOW,
    ...overrides,
  };
}

describe("cli auth mode", () => {
  it("returns the stored session token", async () => {
    const provider = createTokenProvider(
      deps({ readCliToken: vi.fn().mockResolvedValue({ token: SECRET, expiresAt: undefined }) }),
    );
    await expect(provider(instance())).resolves.toBe(SECRET);
  });

  it("looks the session up by host", async () => {
    const readCliToken = vi.fn().mockResolvedValue({ token: SECRET, expiresAt: undefined });
    await createTokenProvider(deps({ readCliToken }))(instance({ baseUrl: "https://argocd.example.com:8443" }));
    expect(readCliToken).toHaveBeenCalledWith("argocd.example.com:8443");
  });

  it("throws an actionable AuthError when there is no session", async () => {
    const provider = createTokenProvider(deps());
    await expect(provider(instance())).rejects.toThrowError(AuthError);
    await expect(provider(instance())).rejects.toThrowError(/SSO login/);
  });

  it("throws when the session has expired", async () => {
    const expired = { token: SECRET, expiresAt: new Date(NOW.getTime() - 1000) };
    const provider = createTokenProvider(deps({ readCliToken: vi.fn().mockResolvedValue(expired) }));
    await expect(provider(instance())).rejects.toThrowError(/expired/);
  });

  it("carries the instance id and the host on the error", async () => {
    const provider = createTokenProvider(deps());
    await provider(instance()).catch((error: AuthError) => {
      expect(error.instanceId).toBe("i1");
      expect(error.host).toBe("argocd.example.com");
    });
    expect.assertions(2);
  });
});

describe("token auth mode", () => {
  it("returns the stored token and never touches the CLI config", async () => {
    const d = deps({ readStoredToken: vi.fn().mockResolvedValue(SECRET) });
    await expect(createTokenProvider(d)(instance({ authMode: "token" }))).resolves.toBe(SECRET);
    expect(d.readCliToken).not.toHaveBeenCalled();
  });

  it("throws when the store holds nothing", async () => {
    const provider = createTokenProvider(deps());
    await expect(provider(instance({ authMode: "token" }))).rejects.toThrowError(/Manage Instances/);
  });
});

describe("secret hygiene", () => {
  it("never puts the token in an error message", async () => {
    const expired = { token: SECRET, expiresAt: new Date(NOW.getTime() - 1000) };
    const provider = createTokenProvider(deps({ readCliToken: vi.fn().mockResolvedValue(expired) }));
    await provider(instance()).catch((error: Error) => {
      expect(error.message).not.toContain(SECRET);
    });
    expect.assertions(1);
  });
});
