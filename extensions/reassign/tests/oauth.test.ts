import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const shared = vi.hoisted(() => ({
  path: "",
  tokens: undefined as { accessToken: string; refreshToken?: string; isExpired: () => boolean } | undefined,
  storage: new Map<string, string>(),
  authorize: vi.fn(),
  writes: 0,
}));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return shared.path;
    },
  },
  LocalStorage: {
    getItem: async (k: string) => shared.storage.get(k),
    setItem: async (k: string, v: string) => {
      shared.storage.set(k, v);
    },
  },
  OAuth: {
    RedirectMethod: { Web: "web" },
    PKCEClient: class {
      getTokens = async () => shared.tokens;
      setTokens = async (v: { access_token: string; refresh_token?: string }) => {
        shared.writes++;
        shared.tokens = { accessToken: v.access_token, refreshToken: v.refresh_token, isExpired: () => false };
      };
      removeTokens = async () => {
        shared.tokens = undefined;
      };
      authorizationRequest = async () => ({
        redirectURI: "https://raycast.com/redirect?packageName=Extension",
        codeVerifier: "verifier",
      });
      authorize = shared.authorize;
    },
  },
}));

beforeEach(async () => {
  vi.resetModules();
  shared.path = await mkdtemp(join(tmpdir(), "reassign-auth-test-"));
  shared.storage.clear();
  shared.writes = 0;
  shared.authorize.mockReset();
  shared.tokens = { accessToken: "old", refreshToken: "refresh", isExpired: () => true };
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(shared.path, { recursive: true, force: true });
});

for (const [status, payload] of [
  [429, { error: "invalid_grant" }],
  [408, {}],
  [503, {}],
  [400, { error: "invalid_request" }],
  [200, {}],
  [200, { access_token: "" }],
] as const) {
  it(`retains credentials for retryable/malformed response ${status} ${JSON.stringify(payload)}`, async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload, { status })),
    );
    const auth = await import("../src/lib/oauth");
    await expect(auth.getAccessToken()).rejects.toThrow();
    expect(shared.tokens.refreshToken).toBe("refresh");
    expect(shared.writes).toBe(0);
  });
}
it("only clears a confirmed invalid grant", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "invalid_grant" }, { status: 400 })),
  );
  const auth = await import("../src/lib/oauth");
  await expect(auth.getAccessToken()).rejects.toThrow("Session expired");
  expect(shared.tokens).toBeUndefined();
  expect(shared.authorize).not.toHaveBeenCalled();
});
it("keeps credentials on a network failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("offline");
    }),
  );
  const auth = await import("../src/lib/oauth");
  await expect(auth.getAccessToken()).rejects.toThrow("offline");
  expect(shared.tokens.refreshToken).toBe("refresh");
});
it("serializes isolated command refresh and logout against the shared store", async () => {
  let finish!: (r: Response) => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      started();
      return new Promise<Response>((r) => {
        finish = r;
      });
    }),
  );
  const now = await import("../src/lib/oauth");
  vi.resetModules();
  const agenda = await import("../src/lib/oauth");
  const refresh = now.getAccessToken();
  await entered;
  const logout = agenda.signOut();
  finish(Response.json({ access_token: "fresh", refresh_token: "rotated" }));
  await refresh;
  await logout;
  expect(shared.tokens).toBeUndefined();
  await expect(now.getAccessToken()).rejects.toThrow("Signed out");
  expect(shared.authorize).not.toHaveBeenCalled();
});
it("coalesces expired reads across isolated commands", async () => {
  const fetch = vi.fn(async () => Response.json({ access_token: "fresh" }));
  vi.stubGlobal("fetch", fetch);
  const first = await import("../src/lib/oauth");
  vi.resetModules();
  const second = await import("../src/lib/oauth");
  expect(await Promise.all([first.getAccessToken(), second.getAccessToken()])).toEqual(["fresh", "fresh"]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(shared.tokens.refreshToken).toBe("refresh");
});
it("does not commit a login that was cancelled by another command's logout", async () => {
  let finish!: (v: { authorizationCode: string }) => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  shared.authorize.mockImplementation(() => {
    started();
    return new Promise((r) => {
      finish = r;
    });
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ access_token: "fresh" })),
  );
  const first = await import("../src/lib/oauth");
  vi.resetModules();
  const second = await import("../src/lib/oauth");
  const login = first.signIn();
  await entered;
  await second.signOut();
  finish({ authorizationCode: "code" });
  await expect(login).rejects.toThrow("Signed out");
  expect(shared.tokens).toBeUndefined();
});
it("automatic recovery respects logout from another command", async () => {
  const first = await import("../src/lib/oauth");
  vi.resetModules();
  const second = await import("../src/lib/oauth");
  await second.signOut();
  await expect(first.signIn({ automatic: true })).rejects.toThrow("Signed out");
  expect(shared.authorize).not.toHaveBeenCalled();
});
it("explicit foreground launch can sign in after logout", async () => {
  const auth = await import("../src/lib/oauth");
  await auth.signOut();
  shared.authorize.mockResolvedValue({ authorizationCode: "code" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ access_token: "new-session" })),
  );
  expect(await auth.authorize()).toBe("new-session");
  expect(shared.authorize).toHaveBeenCalledTimes(1);
});
