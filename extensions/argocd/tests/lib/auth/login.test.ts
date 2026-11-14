import { describe, expect, it, vi } from "vitest";
import { runSsoLogin, ssoLoginArgs, type SsoLoginDeps } from "../../../src/lib/auth/login";
import type { CliToken } from "../../../src/lib/auth/cliConfig";

/** A clock that only moves when sleep() is called, so the polling loop is deterministic. */
function fakeClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    sleep: async (ms: number) => {
      current += ms;
    },
  };
}

function deps(overrides: Partial<SsoLoginDeps> = {}): SsoLoginDeps {
  const clock = fakeClock();
  return {
    spawn: vi.fn(),
    readToken: vi.fn().mockResolvedValue(undefined),
    sleep: clock.sleep,
    now: clock.now,
    ...overrides,
  };
}

describe("ssoLoginArgs", () => {
  it("runs the SSO login through grpc-web", () => {
    expect(ssoLoginArgs("argocd.example.com")).toEqual(["login", "argocd.example.com", "--sso", "--grpc-web"]);
  });
});

describe("runSsoLogin", () => {
  it("resolves once a fresh token appears and spawns the CLI exactly once", async () => {
    const token: CliToken = { token: "fresh", expiresAt: undefined, refreshToken: undefined };
    let calls = 0;
    const readToken = vi.fn(async () => (++calls >= 3 ? token : undefined));
    const d = deps({ readToken });

    await expect(runSsoLogin("argocd.example.com", "argocd", d)).resolves.toEqual(token);
    expect(d.spawn).toHaveBeenCalledTimes(1);
    expect(d.spawn).toHaveBeenCalledWith("argocd", ssoLoginArgs("argocd.example.com"));
    expect(readToken).toHaveBeenCalledTimes(3);
  });

  it("keeps polling while the stored token is still the expired one", async () => {
    const clock = fakeClock(1_000_000);
    const stale: CliToken = {
      token: "stale",
      expiresAt: new Date(clock.now() - 60_000),
      refreshToken: undefined,
    };
    const fresh: CliToken = {
      token: "fresh",
      expiresAt: new Date(clock.now() + 3_600_000),
      refreshToken: undefined,
    };
    let calls = 0;
    const readToken = vi.fn(async () => (++calls >= 4 ? fresh : stale));

    const result = await runSsoLogin("argocd.example.com", "argocd", {
      spawn: vi.fn(),
      readToken,
      sleep: clock.sleep,
      now: clock.now,
    });

    expect(result.token).toBe("fresh");
    expect(readToken).toHaveBeenCalledTimes(4);
  });

  it("gives up after the timeout with an actionable message", async () => {
    await expect(runSsoLogin("argocd.example.com", "argocd", deps(), 3000, 1000)).rejects.toThrowError(
      /Timed out waiting for the SSO login to argocd\.example\.com/,
    );
  });

  it("polls at the requested interval", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let current = 0;
    const now = vi.fn(() => (current += 1000));
    await expect(
      runSsoLogin("argocd.example.com", "argocd", { spawn: vi.fn(), readToken: vi.fn(), sleep, now }, 2000, 500),
    ).rejects.toThrowError(/Timed out/);
    expect(sleep).toHaveBeenCalledWith(500);
  });
});
