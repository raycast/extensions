import { describe, expect, it, vi } from "vitest";
import { AuthSession, type StoredTokenSet, type TokenStore } from "./auth";

function tokenSet(overrides: Partial<StoredTokenSet> = {}): StoredTokenSet {
  return {
    accessToken: "access-old",
    refreshToken: "refresh-old",
    expiresIn: 3600,
    scope: "api",
    updatedAt: new Date(),
    isExpired: () => false,
    ...overrides,
  };
}

function memoryStore(initial?: StoredTokenSet): TokenStore & {
  current?: StoredTokenSet;
} {
  return {
    current: initial,
    async getTokens() {
      return this.current;
    },
    async setTokens(tokens) {
      this.current = tokenSet({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        scope: tokens.scope,
      });
    },
    async removeTokens() {
      this.current = undefined;
    },
  };
}

describe("AuthSession", () => {
  it("returns no access token when signed out", async () => {
    const session = new AuthSession({ store: memoryStore() });
    await expect(session.getAccessToken()).resolves.toBeUndefined();
  });

  it("returns a valid stored access token without refreshing", async () => {
    const refresh = vi.fn();
    const session = new AuthSession({
      store: memoryStore(tokenSet()),
      refresh,
    });
    await expect(session.getAccessToken()).resolves.toBe("access-old");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refresh and stores rotated tokens", async () => {
    const store = memoryStore(tokenSet({ isExpired: () => true }));
    let resolveRefresh!: (value: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      scope: string;
    }) => void;
    const refresh = vi.fn(
      () =>
        new Promise<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
          scope: string;
        }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const session = new AuthSession({ store, refresh });

    const first = session.getAccessToken();
    const second = session.getAccessToken();
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    resolveRefresh({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresIn: 7200,
      scope: "api",
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      "access-new",
      "access-new",
    ]);
    expect(store.current).toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
  });

  it("clears a terminally expired session", async () => {
    const store = memoryStore(tokenSet({ isExpired: () => true }));
    const session = new AuthSession({
      store,
      refresh: async () => {
        throw new Error("refresh failed");
      },
    });

    await expect(session.getAccessToken()).rejects.toThrow("Sign in again");
    expect(store.current).toBeUndefined();
  });

  it("stores tokens returned by device sign in", async () => {
    const store = memoryStore();
    const start = vi.fn().mockResolvedValue({
      deviceCode: "device-secret",
      userCode: "ABCD-EFGH",
      verificationUri: "https://app.everyapi.ai/device?code=ABCD-EFGH",
      expiresIn: 600,
      interval: 5,
    });
    const poll = vi.fn().mockResolvedValue({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresIn: 3600,
      scope: "api",
    });
    const session = new AuthSession({ store, start, poll });

    const authorization = await session.startSignIn();
    expect(authorization.userCode).toBe("ABCD-EFGH");
    await session.completeSignIn(authorization);
    expect(store.current).toMatchObject({ accessToken: "access-new" });
  });

  it("attempts revocation but always clears local tokens", async () => {
    const store = memoryStore(tokenSet());
    const revoke = vi.fn().mockRejectedValue(new Error("offline"));
    const session = new AuthSession({ store, revoke });

    await expect(session.signOut()).resolves.toBeUndefined();
    expect(revoke).toHaveBeenCalledWith("refresh-old");
    expect(store.current).toBeUndefined();
  });
});
