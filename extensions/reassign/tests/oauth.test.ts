import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm, utimes } from "node:fs/promises";
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
  vi.restoreAllMocks();
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
it.each([false, true])("commits concurrent foreground sign-ins after prior logout: %s", async (signedOut) => {
  const flows: Array<{
    browser: Promise<{ authorizationCode: string }>;
    entered: Promise<void>;
    finish: (v: { authorizationCode: string }) => void;
    mark: () => void;
  }> = [];
  for (let i = 0; i < 2; i++) {
    let resolveBrowser!: (v: { authorizationCode: string }) => void;
    let markEntered!: () => void;
    flows.push({
      browser: new Promise<{ authorizationCode: string }>((r) => {
        resolveBrowser = r;
      }),
      entered: new Promise<void>((r) => {
        markEntered = r;
      }),
      finish: (v: { authorizationCode: string }) => resolveBrowser(v),
      mark: () => markEntered(),
    });
  }
  let callIndex = 0;
  shared.authorize.mockImplementation(() => {
    const f = flows[callIndex++];
    queueMicrotask(() => f.mark());
    return f.browser;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ access_token: "fresh", refresh_token: "rotated" })),
  );
  shared.tokens = undefined; // no refresh grant: force authorize() into the signIn path

  const first = await import("../src/lib/oauth");
  vi.resetModules();
  const second = await import("../src/lib/oauth");

  if (signedOut) await first.signOut();
  const authA = first.authorize();
  await flows[0].entered;
  const authB = second.authorize();
  await flows[1].entered;

  flows[0].finish({ authorizationCode: "codeA" });
  await expect(authA).resolves.toBe("fresh");
  flows[1].finish({ authorizationCode: "codeB" });
  await expect(authB).resolves.toBe("fresh");

  expect(shared.writes).toBe(2);
  const third = await import("../src/lib/oauth");
  expect(await third.getAccessToken()).toBe("fresh");
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

it("a compromised refresh aborts the fetch and never commits tokens", async () => {
  const { SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const lockfile = join(shared.path, "oauth-session.lock");

  // A fetch that stays pending until the lock's AbortSignal fires, mirroring an
  // in-flight refresh. It must reject with the signal's reason (the typed
  // SessionLockCompromisedError) rather than resolve.
  const fetchFn = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (!signal) return reject(new Error("no abort signal wired to fetch"));
        if (signal.aborted) return reject(signal.reason);
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
  vi.stubGlobal("fetch", fetchFn);

  const auth = await import("../src/lib/oauth");
  // shared.tokens is expired by beforeEach, so getAccessToken calls exchangeRefresh.
  const refresh = auth.getAccessToken();
  await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1), { interval: 10, timeout: 1000 });

  // Steal the lock: the holder's first heartbeat (update = stale/2 = 5 s) finds
  // a foreign mtime and invokes onCompromised, which aborts the refresh fetch.
  await utimes(lockfile, new Date(Date.now() - 5000), new Date(Date.now() - 5000));

  await expect(refresh).rejects.toBeInstanceOf(SessionLockCompromisedError);
  // The fetch was aborted before setTokens could run: no token writeback, so the
  // stealing process can complete its own refresh without a double-write.
  expect(shared.writes).toBe(0);
}, 15000);

it("a compromised login does not write tokens after its pending session read finishes", async () => {
  const { LocalStorage } = await import("@raycast/api");
  const { SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const auth = await import("../src/lib/oauth");
  shared.authorize.mockResolvedValue({ authorizationCode: "code" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ access_token: "obsolete-login" })),
  );
  let finishRead!: (v: undefined) => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  vi.spyOn(LocalStorage, "getItem")
    .mockResolvedValueOnce(undefined)
    .mockImplementationOnce(() => {
      started();
      return new Promise((r) => {
        finishRead = r;
      });
    });
  const login = auth.signIn();
  await entered;
  await utimes(join(shared.path, "oauth-session.lock"), new Date(Date.now() - 5000), new Date(Date.now() - 5000));
  await expect(login).rejects.toBeInstanceOf(SessionLockCompromisedError);
  finishRead(undefined);
  await new Promise((r) => setTimeout(r, 20));
  expect(shared.writes).toBe(0);
}, 15000);

it("a compromised logout does not remove tokens after its pending session write finishes", async () => {
  const { LocalStorage } = await import("@raycast/api");
  const { SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const auth = await import("../src/lib/oauth");
  let finishWrite!: () => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  vi.spyOn(LocalStorage, "setItem").mockImplementationOnce(() => {
    started();
    return new Promise<void>((r) => {
      finishWrite = r;
    });
  });
  const logout = auth.signOut();
  await entered;
  await utimes(join(shared.path, "oauth-session.lock"), new Date(Date.now() - 5000), new Date(Date.now() - 5000));
  await expect(logout).rejects.toBeInstanceOf(SessionLockCompromisedError);
  shared.tokens = { accessToken: "new-session", refreshToken: "new-refresh", isExpired: () => false };
  finishWrite();
  await new Promise((r) => setTimeout(r, 20));
  expect(shared.tokens?.accessToken).toBe("new-session");
}, 15000);

it("a compromised refresh cannot clear a newer session after a late invalid grant", async () => {
  const { SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const auth = await import("../src/lib/oauth");
  let finishBody!: (value: { error: string }) => void;
  let started!: () => void;
  const entered = new Promise<void>((r) => {
    started = r;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      status: 400,
      json: () => {
        started();
        return new Promise((r) => {
          finishBody = r;
        });
      },
    })),
  );
  const refresh = auth.getAccessToken();
  await entered;
  await utimes(join(shared.path, "oauth-session.lock"), new Date(Date.now() - 5000), new Date(Date.now() - 5000));
  await expect(refresh).rejects.toBeInstanceOf(SessionLockCompromisedError);
  shared.tokens = { accessToken: "new-session", refreshToken: "new-refresh", isExpired: () => false };
  finishBody({ error: "invalid_grant" });
  await new Promise((r) => setTimeout(r, 20));
  expect(shared.tokens?.accessToken).toBe("new-session");
}, 15000);

it.each([
  { initiallySignedOut: true, newerLogin: false },
  { initiallySignedOut: false, newerLogin: true },
  { initiallySignedOut: true, newerLogin: true },
])("cancels an older login across every intervening logout: %j", async ({ initiallySignedOut, newerLogin }) => {
  const first = await import("../src/lib/oauth");
  vi.resetModules();
  const second = await import("../src/lib/oauth");
  if (initiallySignedOut) await first.signOut();
  let finish!: (v: { authorizationCode: string }) => void;
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  shared.authorize.mockImplementationOnce(() => {
    started();
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  shared.authorize.mockResolvedValue({ authorizationCode: "new" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const code = new URLSearchParams(String(init.body)).get("code");
      return Response.json({ access_token: code === "old" ? "obsolete-session" : "new-session" });
    }),
  );
  const login = first.signIn();
  await entered;
  await second.signOut();
  if (newerLogin) await second.signIn();
  finish({ authorizationCode: "old" });
  await expect(login).rejects.toThrow("Signed out");
  expect(shared.tokens?.accessToken).toBe(newerLogin ? "new-session" : undefined);
  expect(shared.writes).toBe(newerLogin ? 1 : 0);
});
