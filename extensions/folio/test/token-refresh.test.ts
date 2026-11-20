import { test } from "node:test";
import assert from "node:assert/strict";
import { AuthError } from "../src/lib/auth-error.ts";
import {
  createTokenManager,
  EXPIRY_MARGIN_MS,
  expiresSoon,
  type StoredTokens,
  type TokenResponse,
  type TokenStore,
} from "../src/lib/token-refresh.ts";

const HOUR = 3_600_000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** SnapTrade's refresh endpoint: each refresh token works once and is revoked the moment it's used. */
class FakeSnapTrade {
  valid: string;
  calls: string[] = [];
  private n = 0;
  constructor(
    initial: string,
    private readonly latencyMs = 20,
  ) {
    this.valid = initial;
  }
  exchange = async (refreshToken: string): Promise<TokenResponse> => {
    this.calls.push(refreshToken);
    const ok = refreshToken === this.valid;
    if (ok) {
      this.n += 1;
      this.valid = `rt${this.n}`;
    }
    const issued = this.valid;
    const access = `at${this.n}`;
    await sleep(this.latencyMs);
    if (!ok) throw new AuthError("Auth worker /oauth/refresh failed (invalid_grant)", "refresh-failed");
    return { access_token: access, refresh_token: issued, expires_in: 36_000 };
  };
  revokeAll() {
    this.valid = "revoked";
  }
}

/** One token store shared by every "process", like Raycast's per-extension OAuth storage. */
class SharedStore implements TokenStore {
  tokens: StoredTokens | undefined;
  removed = 0;
  constructor(
    tokens: StoredTokens | undefined,
    private readonly writeDelayMs = 0,
  ) {
    this.tokens = tokens;
  }
  async get() {
    return this.tokens ? { ...this.tokens } : undefined;
  }
  async set(t: TokenResponse) {
    if (this.writeDelayMs) await sleep(this.writeDelayMs);
    this.tokens = {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresIn: t.expires_in,
      updatedAt: new Date(),
    };
  }
  async remove() {
    this.removed += 1;
    this.tokens = undefined;
  }
}

/** Tokens issued `ageMs` ago with a 10 h lifetime. Pass `null` for a session without a refresh token. */
function tokensAged(ageMs: number, refreshToken: string | null = "rt0"): StoredTokens {
  return {
    accessToken: "at0",
    refreshToken: refreshToken ?? undefined,
    expiresIn: 36_000,
    updatedAt: new Date(Date.now() - ageMs),
  };
}

function manager(store: TokenStore, server: FakeSnapTrade, settleDelaysMs = [20, 60, 150]) {
  return createTokenManager({ store, exchange: server.exchange, settleDelaysMs });
}

test("two processes refreshing with the same refresh token: the loser picks up the winner's tokens", async () => {
  const server = new FakeSnapTrade("rt0");
  const store = new SharedStore(tokensAged(10 * HOUR));
  const menuBar = manager(store, server);
  const portfolio = manager(store, server);

  const [a, b] = await Promise.all([menuBar.getAccessToken(), portfolio.getAccessToken()]);

  assert.deepEqual(server.calls, ["rt0", "rt0"], "both processes really did race with the same token");
  assert.equal(a, "at1");
  assert.equal(b, "at1");
  assert.equal(store.removed, 0, "nobody was signed out");
  assert.equal(store.tokens?.refreshToken, "rt1", "the winner's new pair is still stored");
});

test("the loser waits for the winner's write when its invalid_grant arrives first", async () => {
  const server = new FakeSnapTrade("rt0", 5);
  const store = new SharedStore(tokensAged(10 * HOUR), 80); // the winner takes a while to store its pair
  const [a, b] = await Promise.all([manager(store, server).getAccessToken(), manager(store, server).getAccessToken()]);
  assert.equal(a, "at1");
  assert.equal(b, "at1");
  assert.equal(store.removed, 0);
});

test("a genuinely revoked refresh token still signs out", async () => {
  const server = new FakeSnapTrade("rt0");
  server.revokeAll();
  const store = new SharedStore(tokensAged(10 * HOUR));
  await assert.rejects(manager(store, server).getAccessToken(), (e: unknown) => {
    return e instanceof AuthError && e.reason === "signed-out";
  });
  assert.equal(store.removed, 1);
  assert.equal(store.tokens, undefined);
});

test("if another process already signed out, a failed refresh doesn't touch the store", async () => {
  const server = new FakeSnapTrade("rt0");
  server.revokeAll();
  const store = new SharedStore(tokensAged(10 * HOUR));
  const exchange = async (rt: string) => {
    store.tokens = undefined; // the user signed out in another command meanwhile
    return server.exchange(rt);
  };
  const m = createTokenManager({ store, exchange, settleDelaysMs: [10] });
  await assert.rejects(m.getAccessToken(), (e: unknown) => e instanceof AuthError && e.reason === "signed-out");
  assert.equal(store.removed, 0);
});

test("refreshes 5 minutes ahead of expiry, not before", async () => {
  const lifetime = 36_000_000;
  const almost = new FakeSnapTrade("rt0");
  const almostStore = new SharedStore(tokensAged(lifetime - EXPIRY_MARGIN_MS + 30_000)); // 4.5 min left
  assert.equal(await manager(almostStore, almost).getAccessToken(), "at1");
  assert.deepEqual(almost.calls, ["rt0"]);

  const plenty = new FakeSnapTrade("rt0");
  const plentyStore = new SharedStore(tokensAged(lifetime - 20 * 60_000)); // 20 min left
  assert.equal(await manager(plentyStore, plenty).getAccessToken(), "at0");
  assert.deepEqual(plenty.calls, []);
});

test("expiresSoon caps the margin for short-lived tokens and ignores unknown lifetimes", () => {
  const now = Date.now();
  const short: StoredTokens = { accessToken: "a", expiresIn: 60, updatedAt: new Date(now) };
  assert.equal(expiresSoon(short, now), false, "a fresh 60 s token isn't already 'expiring'");
  assert.equal(expiresSoon(short, now + 31_000), true);
  assert.equal(expiresSoon({ accessToken: "a", updatedAt: new Date(0) }, now), false);
});

test("a 401 for a token that was already replaced retries with the stored one, no extra refresh", async () => {
  const server = new FakeSnapTrade("rt5");
  const store = new SharedStore({ accessToken: "at5", refreshToken: "rt5", expiresIn: 36_000, updatedAt: new Date() });
  const token = await manager(store, server).getAccessToken({ force: true, rejected: "at4" });
  assert.equal(token, "at5");
  assert.deepEqual(server.calls, []);
});

test("a 401 for the current token forces exactly one refresh", async () => {
  const server = new FakeSnapTrade("rt0");
  const store = new SharedStore(tokensAged(HOUR));
  const m = manager(store, server);
  const tokens = await Promise.all([1, 2, 3, 4, 5].map(() => m.getAccessToken({ force: true, rejected: "at0" })));
  assert.deepEqual(new Set(tokens), new Set(["at1"]));
  assert.deepEqual(server.calls, ["rt0"]);
});

test("within one process, a caller holding the old refresh token doesn't spend it again", async () => {
  const server = new FakeSnapTrade("rt0");
  const store = new SharedStore(tokensAged(10 * HOUR));
  const m = manager(store, server);
  const stale = await store.get(); // read before the refresh below completes
  assert.equal(await m.getAccessToken(), "at1");
  store.tokens = stale; // replay the old read
  assert.equal(await m.getAccessToken(), "at1");
  assert.deepEqual(server.calls, ["rt0"]);
});

test("without a refresh token: usable until it really expires, then signed out", async () => {
  const server = new FakeSnapTrade("rt0");
  const nearly = new SharedStore(tokensAged(36_000_000 - 60_000, null)); // 1 min left
  assert.equal(await manager(nearly, server).getAccessToken(), "at0");
  const expired = new SharedStore(tokensAged(36_000_000 + 1000, null));
  await assert.rejects(manager(expired, server).getAccessToken(), (e: unknown) => {
    return e instanceof AuthError && e.reason === "signed-out";
  });
  assert.equal(expired.removed, 1);
});

test("worker errors other than invalid_grant don't sign out", async () => {
  const store = new SharedStore(tokensAged(10 * HOUR));
  const m = createTokenManager({
    store,
    exchange: async () => {
      throw new AuthError("Auth worker /oauth/refresh failed (HTTP 502)", "worker");
    },
  });
  await assert.rejects(m.getAccessToken(), (e: unknown) => e instanceof AuthError && e.reason === "worker");
  assert.equal(store.removed, 0);
  assert.equal(store.tokens?.refreshToken, "rt0");
});

test("an early refresh that fails because the auth worker is down keeps using the still-valid token", async () => {
  const store = new SharedStore(tokensAged(36_000_000 - 2 * 60_000)); // 2 min left: inside the early window
  let calls = 0;
  const m = createTokenManager({
    store,
    exchange: async () => {
      calls += 1;
      throw new AuthError("Auth worker /oauth/refresh failed (HTTP 503)", "worker");
    },
  });
  assert.equal(await m.getAccessToken(), "at0");
  assert.equal(calls, 1, "it did try");
  assert.equal(store.removed, 0);
});

test("a slow auth worker during an early refresh doesn't hold requests; the refresh still lands", async () => {
  const server = new FakeSnapTrade("rt0", 200);
  const store = new SharedStore(tokensAged(36_000_000 - 2 * 60_000)); // inside the early window
  const m = createTokenManager({ store, exchange: server.exchange, earlyRefreshWaitMs: 30 });
  const started = Date.now();
  assert.equal(await m.getAccessToken(), "at0", "goes ahead with the still-valid token");
  assert.ok(Date.now() - started < 150, "didn't wait for the worker");
  await sleep(250);
  assert.equal(store.tokens?.refreshToken, "rt1", "the refresh finished and was stored");
  assert.equal(await m.getAccessToken(), "at1");
  assert.deepEqual(server.calls, ["rt0"], "one refresh, not one per request");
});

test("once the token has really expired, an auth-worker failure is reported instead of using it", async () => {
  const store = new SharedStore(tokensAged(36_000_000 + 1000));
  const m = createTokenManager({
    store,
    exchange: async () => {
      throw new AuthError("Auth worker /oauth/refresh failed (HTTP 503)", "worker");
    },
  });
  await assert.rejects(m.getAccessToken(), (e: unknown) => e instanceof AuthError && e.reason === "worker");
});

test("an early refresh that finds the session dead still signs out", async () => {
  const server = new FakeSnapTrade("rt0");
  server.revokeAll();
  const store = new SharedStore(tokensAged(36_000_000 - 2 * 60_000));
  await assert.rejects(manager(store, server).getAccessToken(), (e: unknown) => {
    return e instanceof AuthError && e.reason === "signed-out";
  });
  assert.equal(store.removed, 1);
});
