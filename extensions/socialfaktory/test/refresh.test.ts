import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CODE_EXCHANGE_TIMEOUT_MS,
  LEASE_KEY,
  LEASE_MS,
  REFRESH_TIMEOUT_MS,
  CONNECTION_RENEWAL,
  SIGN_IN_ELSEWHERE,
  SIGN_IN_HEARTBEAT_MS,
  SIGN_IN_KEY,
  SIGN_IN_MAX_WAIT_MS,
  SIGN_IN_POLL_MS,
  SIGN_IN_STALE_MS,
  SIGN_IN_STALE_RECHECK_MS,
  SIGN_IN_UNFINISHED,
  TOOL_SIGN_IN_WAIT_MS,
  TokenEndpointError,
  TokenTimeoutError,
  refreshAccessToken,
  registerClient,
  withLease,
  requestTokens,
  signInOnce,
  type RefreshDependencies,
  type SignInDependencies,
  type TokenResponse,
  type TokenSnapshot,
} from "../src/lib/refresh.ts";
import { McpNetworkError, UNREACHABLE } from "../src/lib/mcp.ts";

type World = {
  tokens: TokenSnapshot | undefined;
  storage: Map<string, string>;
  clock: number;
  refreshed: string[];
};

function world(tokens: TokenSnapshot | undefined): World {
  return { tokens, storage: new Map(), clock: 1_000_000, refreshed: [] };
}

function storageOf(state: World) {
  return {
    getItem: async (key: string) => state.storage.get(key),
    setItem: async (key: string, value: string) => {
      state.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      state.storage.delete(key);
    },
  };
}

function dependencies(
  state: World,
  refresh: (refreshToken: string) => Promise<TokenResponse>,
  onSleep: () => void = () => {},
): RefreshDependencies {
  return {
    readTokens: async () => state.tokens,
    saveTokens: async (response, previousRefreshToken) => {
      state.tokens = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token ?? previousRefreshToken,
        expired: false,
      };
    },
    refresh: async (refreshToken) => {
      state.refreshed.push(refreshToken);
      return refresh(refreshToken);
    },
    storage: storageOf(state),
    now: () => state.clock,
    sleep: async (ms) => {
      state.clock += ms;
      onSleep();
    },
    random: () => 0.5,
    forgetTokens: async (staleAccessToken) => {
      if (state.tokens?.accessToken === staleAccessToken) state.tokens = undefined;
    },
  };
}

const expired: TokenSnapshot = { accessToken: "access-1", refreshToken: "refresh-1", expired: true };

describe("refreshAccessToken", () => {
  it("refreshes with the stored refresh token, saves the rotated tokens and releases the lease", async () => {
    const state = world(expired);
    const token = await refreshAccessToken(
      dependencies(state, async () => ({ access_token: "access-2", refresh_token: "refresh-2" })),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.deepEqual(state.refreshed, ["refresh-1"]);
    assert.equal(state.tokens?.refreshToken, "refresh-2");
    assert.equal(state.storage.has(LEASE_KEY), false);
  });

  it("uses the tokens another process already rotated without spending the refresh token", async () => {
    const state = world({ accessToken: "access-2", refreshToken: "refresh-2", expired: false });
    const token = await refreshAccessToken(
      dependencies(state, async () => assert.fail("refreshed twice")),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.deepEqual(state.refreshed, []);
  });

  it("waits on a lease another process holds, then uses the tokens it saved", async () => {
    const state = world(expired);
    state.storage.set(LEASE_KEY, JSON.stringify({ owner: "other", at: state.clock }));
    let sleeps = 0;
    const token = await refreshAccessToken(
      dependencies(
        state,
        async () => assert.fail("refreshed twice"),
        () => {
          sleeps += 1;
          if (sleeps === 3) {
            state.tokens = { accessToken: "access-2", refreshToken: "refresh-2", expired: false };
            state.storage.delete(LEASE_KEY);
          }
        },
      ),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.deepEqual(state.refreshed, []);
  });

  it("takes over a lease its holder abandoned", async () => {
    const state = world(expired);
    state.storage.set(LEASE_KEY, JSON.stringify({ owner: "other", at: state.clock - LEASE_MS }));
    const token = await refreshAccessToken(
      dependencies(state, async () => ({ access_token: "access-2", refresh_token: "refresh-2" })),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.deepEqual(state.refreshed, ["refresh-1"]);
  });

  it("treats a lease stamped in the future as abandoned", async () => {
    const state = world(expired);
    state.storage.set(LEASE_KEY, JSON.stringify({ owner: "other", at: state.clock + 3_600_000 }));
    const token = await refreshAccessToken(
      dependencies(state, async () => ({ access_token: "access-2", refresh_token: "refresh-2" })),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.ok(state.clock - 1_000_000 < LEASE_MS);
  });

  it("gives up a lease another process overwrote before it could confirm it", async () => {
    const state = world(expired);
    let sleeps = 0;
    const token = await refreshAccessToken(
      dependencies(
        state,
        async () => assert.fail("refreshed after losing the lease"),
        () => {
          sleeps += 1;
          if (sleeps === 1) state.storage.set(LEASE_KEY, JSON.stringify({ owner: "other", at: state.clock }));
          if (sleeps === 4) {
            state.tokens = { accessToken: "access-2", refreshToken: "refresh-2", expired: false };
            state.storage.delete(LEASE_KEY);
          }
        },
      ),
      "access-1",
    );

    assert.equal(token, "access-2");
  });

  it("refreshes a token the server refused even when it has not expired yet", async () => {
    const state = world({ accessToken: "access-1", refreshToken: "refresh-1", expired: false });
    const token = await refreshAccessToken(
      dependencies(state, async () => ({ access_token: "access-2" })),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.equal(state.tokens?.refreshToken, "refresh-1");
  });

  it("answers nothing when the server rejects the grant and nobody rotated the tokens", async () => {
    const state = world(expired);
    const token = await refreshAccessToken(
      dependencies(state, async () => {
        throw new TokenEndpointError("invalid_grant", 400, "The refresh token is invalid");
      }),
      "access-1",
    );

    assert.equal(token, undefined);
    assert.equal(state.storage.has(LEASE_KEY), false);
  });

  it("re-reads the tokens once after a rejected grant and uses a newer set", async () => {
    const state = world(expired);
    const token = await refreshAccessToken(
      dependencies(state, async () => {
        state.tokens = { accessToken: "access-2", refreshToken: "refresh-2", expired: false };
        throw new TokenEndpointError("invalid_grant", 400, "The refresh token is invalid");
      }),
      "access-1",
    );

    assert.equal(token, "access-2");
  });

  it("surfaces a server, rate limit, timeout or network failure and keeps the tokens", async () => {
    for (const failure of [
      new TokenEndpointError(undefined, 503, "Service Unavailable"),
      new TokenEndpointError(undefined, 429, "Too Many Requests"),
      new Error("SocialFaktory took too long to answer"),
      new TypeError("fetch failed"),
    ]) {
      const state = world(expired);
      await assert.rejects(
        refreshAccessToken(
          dependencies(state, async () => {
            throw failure;
          }),
          "access-1",
        ),
        failure,
      );
      assert.deepEqual(state.tokens, expired);
      assert.equal(state.storage.has(LEASE_KEY), false);
    }
  });

  it("answers nothing when there is no refresh token", async () => {
    const state = world({ accessToken: "access-1", expired: true });
    const token = await refreshAccessToken(
      dependencies(state, async () => assert.fail("refreshed without a refresh token")),
      "access-1",
    );

    assert.equal(token, undefined);
  });

  it("discards its result when Sign in Again replaced the tokens during the refresh", async () => {
    const state = world(expired);
    let saved = false;
    const deps = dependencies(state, async () => {
      state.tokens = { accessToken: "access-new", refreshToken: "refresh-new", expired: false };
      return { access_token: "access-old-rotated", refresh_token: "refresh-old-rotated" };
    });
    const token = await refreshAccessToken(
      {
        ...deps,
        saveTokens: async (...args) => {
          saved = true;
          return deps.saveTokens(...args);
        },
      },
      "access-1",
    );

    assert.equal(saved, false);
    assert.equal(token, "access-new");
    assert.equal(state.tokens?.refreshToken, "refresh-new");
  });

  it("answers nothing when the tokens it refreshed were removed meanwhile", async () => {
    const state = world(expired);
    const token = await refreshAccessToken(
      dependencies(state, async () => {
        state.tokens = undefined;
        return { access_token: "access-old-rotated", refresh_token: "refresh-old-rotated" };
      }),
      "access-1",
    );

    assert.equal(token, undefined);
    assert.equal(state.tokens, undefined);
  });

  it("treats only invalid_grant and invalid_client as a rejection", () => {
    assert.equal(new TokenEndpointError("invalid_grant", 400, "").rejected, true);
    assert.equal(new TokenEndpointError("invalid_client", 401, "").rejected, true);
    assert.equal(new TokenEndpointError("invalid_request", 400, "").rejected, false);
    assert.equal(new TokenEndpointError(undefined, 500, "").rejected, false);
  });
});

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class VirtualClock {
  now = 0;
  private timers: { at: number; order: number; resolve: () => void }[] = [];
  private order = 0;

  sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      this.timers.push({ at: this.now + ms, order: this.order++, resolve });
    });

  async run<T>(work: Promise<T>): Promise<T> {
    let settled = false;
    work.then(
      () => (settled = true),
      () => (settled = true),
    );
    for (;;) {
      await new Promise((resolve) => setImmediate(resolve));
      if (settled) return work;
      this.timers.sort((a, b) => a.at - b.at || a.order - b.order);
      const next = this.timers.shift();
      if (!next) throw new Error("the simulation stalled");
      this.now = next.at;
      next.resolve();
    }
  }
}

async function race(seed: number) {
  const random = seeded(seed);
  const clock = new VirtualClock();
  const storageLatency = () => clock.sleep(random() * 60);
  const storage = new Map<string, string>();
  let tokens: TokenSnapshot = { accessToken: "access-0", refreshToken: "refresh-0", expired: true };
  const spent = new Set<string>();
  let doubleSpends = 0;
  let rotations = 0;

  const shared: RefreshDependencies = {
    forgetTokens: async () => {},
    readTokens: async () => {
      await storageLatency();
      return tokens;
    },
    saveTokens: async (response, previousRefreshToken) => {
      await storageLatency();
      tokens = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token ?? previousRefreshToken,
        expired: false,
      };
    },
    refresh: async (refreshToken) => {
      if (spent.has(refreshToken)) doubleSpends += 1;
      spent.add(refreshToken);
      await clock.sleep(200 + random() * 1500);
      rotations += 1;
      return { access_token: `access-${rotations}`, refresh_token: `refresh-${rotations}` };
    },
    storage: {
      getItem: async (key) => {
        await storageLatency();
        return storage.get(key);
      },
      setItem: async (key, value) => {
        await storageLatency();
        storage.set(key, value);
      },
      removeItem: async (key) => {
        await storageLatency();
        storage.delete(key);
      },
    },
    now: () => clock.now,
    sleep: clock.sleep,
    random,
  };

  const processes = 2 + Math.floor(random() * 3);
  const answers = await clock.run(
    Promise.all(
      Array.from({ length: processes }, async () => {
        await clock.sleep(random() * 100);
        return refreshAccessToken(shared, "access-0");
      }),
    ),
  );
  return { doubleSpends, rotations, answers, finalToken: tokens.accessToken };
}

describe("refreshAccessToken across processes", () => {
  it("never spends a refresh token twice when processes race on jittered storage", async () => {
    let doubleSpends = 0;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const outcome = await race(seed);
      doubleSpends += outcome.doubleSpends;
      assert.equal(outcome.rotations, 1, `seed ${seed} refreshed ${outcome.rotations} times`);
      assert.ok(
        outcome.answers.every((answer) => answer === outcome.finalToken),
        `seed ${seed} answered ${outcome.answers.join(", ")}`,
      );
    }
    assert.equal(doubleSpends, 0);
  });
});

describe("requestTokens", () => {
  const params = { grant_type: "refresh_token", refresh_token: "refresh-1", client_id: "client-1" };

  it("posts the form and answers the tokens", async () => {
    let sent: RequestInit | undefined;
    const tokens = await requestTokens(
      async (_url, init) => {
        sent = init;
        return new Response(JSON.stringify({ access_token: "access-2", refresh_token: "refresh-2" }));
      },
      "https://example.test/oauth/token",
      params,
      REFRESH_TIMEOUT_MS,
    );

    assert.deepEqual(tokens, { access_token: "access-2", refresh_token: "refresh-2" });
    assert.equal(String(sent?.body), "grant_type=refresh_token&refresh_token=refresh-1&client_id=client-1");
    assert.ok(sent?.signal instanceof AbortSignal);
  });

  it("names a rejected grant", async () => {
    await assert.rejects(
      requestTokens(
        async () =>
          new Response(JSON.stringify({ error: "invalid_grant", error_description: "revoked" }), { status: 400 }),
        "https://example.test/oauth/token",
        params,
        REFRESH_TIMEOUT_MS,
      ),
      (error: unknown) => error instanceof TokenEndpointError && error.rejected && error.status === 400,
    );
  });

  it("keeps a rate limited answer transient", async () => {
    await assert.rejects(
      requestTokens(
        async () =>
          new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
            status: 429,
            headers: { "Retry-After": "60" },
          }),
        "https://example.test/oauth/token",
        params,
        REFRESH_TIMEOUT_MS,
      ),
      (error: unknown) => error instanceof TokenEndpointError && !error.rejected && error.status === 429,
    );
  });

  it("gives up on a token endpoint that does not answer in time", async () => {
    const slow = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });

    await assert.rejects(requestTokens(slow, "https://example.test/oauth/token", params, 20), (error: unknown) => {
      assert.ok(error instanceof TokenTimeoutError);
      assert.equal((error as Error).message, CONNECTION_RENEWAL);
      assert.doesNotMatch(CONNECTION_RENEWAL, /try again in a moment|other window|did not answer the sign-in/i);
      assert.match(CONNECTION_RENEWAL, /needs to be renewed/);
      assert.match(CONNECTION_RENEWAL, /sign in again/i);
      return true;
    });
  });
});

describe("network failures during sign-in", () => {
  const params = { grant_type: "refresh_token", refresh_token: "refresh-1", client_id: "client-1" };
  const offline = async (): Promise<Response> => {
    throw new TypeError("fetch failed");
  };

  it("names an unreachable token endpoint the way MCP calls do", async () => {
    await assert.rejects(requestTokens(offline, "https://example.test/oauth/token", params, REFRESH_TIMEOUT_MS), {
      name: "McpNetworkError",
      message: UNREACHABLE,
    });
  });

  it("keeps the tokens when a refresh cannot reach the server", async () => {
    const state = world(expired);

    await assert.rejects(
      refreshAccessToken(
        dependencies(state, async () => {
          throw new McpNetworkError(UNREACHABLE);
        }),
        "access-1",
      ),
      { message: UNREACHABLE },
    );
    assert.deepEqual(state.tokens, expired);
  });

  it("names an unreachable registration endpoint the same way", async () => {
    await assert.rejects(
      registerClient(offline, "https://example.test/oauth/register", "raycast://oauth?package_name=x", "read", 1_000),
      { name: "McpNetworkError", message: UNREACHABLE },
    );
  });

  it("registers a client and reports a refused registration", async () => {
    let body: unknown;
    const clientId = await registerClient(
      async (_url, init) => {
        body = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ client_id: "client-9" }), { status: 201 });
      },
      "https://example.test/oauth/register",
      "raycast://oauth?package_name=x",
      "read generate",
      1_000,
    );

    assert.equal(clientId, "client-9");
    assert.deepEqual((body as { redirect_uris: string[] }).redirect_uris, ["raycast://oauth?package_name=x"]);
    await assert.rejects(
      registerClient(
        async () =>
          new Response(JSON.stringify({ error: "invalid_redirect_uri", error_description: "not allowed" }), {
            status: 400,
          }),
        "https://example.test/oauth/register",
        "raycast://oauth?package_name=x",
        "read",
        1_000,
      ),
      /not allowed/,
    );
  });
});

describe("refreshAccessToken after a timeout", () => {
  it("drops the tokens it may have spent and asks to renew the connection", async () => {
    const state = world(expired);

    await assert.rejects(
      refreshAccessToken(
        dependencies(state, async () => {
          throw new TokenTimeoutError();
        }),
        "access-1",
      ),
      { message: CONNECTION_RENEWAL },
    );
    assert.equal(state.tokens, undefined);
    assert.equal(state.storage.has(LEASE_KEY), false);
  });

  it("leaves a process that waited on the lease nothing to replay", async () => {
    const state = world(expired);
    state.storage.set(LEASE_KEY, JSON.stringify({ owner: "other", at: state.clock }));
    let sleeps = 0;
    const token = await refreshAccessToken(
      dependencies(
        state,
        async () => assert.fail("replayed a refresh token the other process may have spent"),
        () => {
          sleeps += 1;
          if (sleeps === 3) {
            state.tokens = undefined;
            state.storage.delete(LEASE_KEY);
          }
        },
      ),
      "access-1",
    );

    assert.equal(token, undefined);
    assert.deepEqual(state.refreshed, []);
  });
});

function signInWorld(tokens: TokenSnapshot | undefined) {
  const state = world(tokens);
  const opened: number[] = [];
  const waiting: boolean[] = [];
  const make = (
    browser: () => Promise<string> = async () => {
      opened.push(state.clock);
      return "access-browser";
    },
    onSleep: () => void = () => {},
  ): SignInDependencies => ({
    readTokens: async () => state.tokens,
    storage: storageOf(state),
    now: () => state.clock,
    sleep: async (ms) => {
      state.clock += ms;
      onSleep();
    },
    random: () => 0.5,
    signInWithBrowser: browser,
    waiting: (active) => waiting.push(active),
  });
  return { state, make, waiting, opened, browserSignIns: () => opened.length };
}

function mark(state: World, at: number) {
  state.storage.set(SIGN_IN_KEY, JSON.stringify({ owner: "other", at }));
}

describe("signInOnce", () => {
  it("opens the browser once, marking the sign in while it runs", async () => {
    const { state, make, waiting } = signInWorld(undefined);
    let marked = false;
    const token = await signInOnce(
      make(async () => {
        marked = state.storage.has(SIGN_IN_KEY);
        return "access-browser";
      }),
      undefined,
    );

    assert.equal(token, "access-browser");
    assert.equal(marked, true);
    assert.equal(state.storage.has(SIGN_IN_KEY), false);
    assert.deepEqual(waiting, []);
  });

  it("waits for the tokens of a sign in another process started, and says so", async () => {
    const { state, make, waiting, browserSignIns } = signInWorld(undefined);
    mark(state, state.clock);
    let sleeps = 0;
    const token = await signInOnce(
      make(undefined, () => {
        sleeps += 1;
        if (sleeps === 5) state.tokens = { accessToken: "access-other", expired: false };
      }),
      undefined,
    );

    assert.equal(token, "access-other");
    assert.equal(browserSignIns(), 0);
    assert.deepEqual(waiting, [true, false]);
  });

  it("keeps waiting past two minutes while the other sign in keeps its heartbeat", async () => {
    const { state, make, browserSignIns } = signInWorld(undefined);
    const started = state.clock;
    mark(state, started);
    const token = await signInOnce(
      make(undefined, () => {
        mark(state, state.clock);
        if (state.clock - started >= 300_000) state.tokens = { accessToken: "access-other", expired: false };
      }),
      undefined,
    );

    assert.equal(token, "access-other");
    assert.equal(browserSignIns(), 0);
  });

  it("treats a marker whose heartbeat stopped as abandoned", async () => {
    const { state, make, opened } = signInWorld(undefined);
    const started = state.clock;
    mark(state, started);
    const token = await signInOnce(make(), undefined);

    assert.equal(token, "access-browser");
    assert.equal(opened.length, 1);
    assert.ok(opened[0] - started >= SIGN_IN_STALE_MS + SIGN_IN_STALE_RECHECK_MS);
    assert.ok(opened[0] - started < SIGN_IN_STALE_MS + SIGN_IN_STALE_RECHECK_MS + 3 * SIGN_IN_POLL_MS);
  });

  it("keeps waiting when a stale-looking marker moves within one heartbeat, as after a laptop wakes", async () => {
    const { state, make, opened } = signInWorld(undefined);
    const started = state.clock;
    mark(state, started - SIGN_IN_STALE_MS);
    const token = await signInOnce(
      make(undefined, () => {
        mark(state, state.clock);
        if (state.clock - started >= 30_000) state.tokens = { accessToken: "access-owner", expired: false };
      }),
      undefined,
    );

    assert.equal(token, "access-owner");
    assert.deepEqual(opened, []);
  });

  it("gives up waiting after the cap even when the heartbeat stays fresh", async () => {
    const { state, make, opened } = signInWorld(undefined);
    const started = state.clock;
    mark(state, started);
    const token = await signInOnce(
      make(undefined, () => mark(state, state.clock)),
      undefined,
    );

    assert.equal(token, "access-browser");
    assert.equal(opened.length, 1);
    assert.ok(opened[0] - started >= SIGN_IN_MAX_WAIT_MS);
  });

  it("takes over a stale or future marker after one heartbeat without movement", async () => {
    assert.ok(SIGN_IN_STALE_RECHECK_MS > SIGN_IN_HEARTBEAT_MS);
    for (const offset of [-SIGN_IN_STALE_MS, 3_600_000]) {
      const { state, make, opened } = signInWorld(undefined);
      mark(state, state.clock + offset);
      const started = state.clock;

      assert.equal(await signInOnce(make(), undefined), "access-browser");
      assert.equal(opened.length, 1);
      assert.ok(opened[0] - started >= SIGN_IN_STALE_RECHECK_MS);
      assert.ok(opened[0] - started < SIGN_IN_STALE_RECHECK_MS + SIGN_IN_POLL_MS);
    }
  });

  it("does not wait on tokens it already knows are stale", async () => {
    const { state, make, browserSignIns } = signInWorld({ accessToken: "access-1", expired: false });
    mark(state, state.clock);
    let sleeps = 0;
    const token = await signInOnce(
      make(undefined, () => {
        sleeps += 1;
        if (sleeps === 2) state.tokens = { accessToken: "access-2", expired: false };
      }),
      "access-1",
    );

    assert.equal(token, "access-2");
    assert.equal(browserSignIns(), 0);
  });

  it("clears its marker when the browser sign in fails", async () => {
    const { state, make } = signInWorld(undefined);

    await assert.rejects(
      signInOnce(
        make(async () => {
          throw new Error("closed");
        }),
        undefined,
      ),
      /closed/,
    );
    assert.equal(state.storage.has(SIGN_IN_KEY), false);
  });
});

async function signInRace(seed: number) {
  const random = seeded(seed);
  const clock = new VirtualClock();
  const storageLatency = () => clock.sleep(random() * 60);
  const storage = new Map<string, string>();
  let tokens: TokenSnapshot | undefined;
  let browsers = 0;
  let longestBeatGap = 0;
  let lastBeat: number | undefined;

  const shared = (): SignInDependencies => ({
    readTokens: async () => {
      await storageLatency();
      return tokens;
    },
    storage: {
      getItem: async (key) => {
        await storageLatency();
        return storage.get(key);
      },
      setItem: async (key, value) => {
        await storageLatency();
        storage.set(key, value);
        if (key === SIGN_IN_KEY) {
          if (lastBeat !== undefined) longestBeatGap = Math.max(longestBeatGap, clock.now - lastBeat);
          lastBeat = clock.now;
        }
      },
      removeItem: async (key) => {
        await storageLatency();
        storage.delete(key);
      },
    },
    now: () => clock.now,
    sleep: clock.sleep,
    random,
    signInWithBrowser: async () => {
      browsers += 1;
      await clock.sleep(30_000 + random() * 370_000);
      tokens = { accessToken: `access-browser-${browsers}`, expired: false };
      return tokens.accessToken;
    },
  });

  const processes = 2 + Math.floor(random() * 3);
  const answers = await clock.run(
    Promise.all(
      Array.from({ length: processes }, async () => {
        await clock.sleep(random() * 50);
        return signInOnce(shared(), undefined);
      }),
    ),
  );
  return { browsers, answers, longestBeatGap };
}

describe("signInOnce for AI tools", () => {
  it("stops waiting on another window after the tool cap and asks to finish there", async () => {
    const { state, make, opened } = signInWorld(undefined);
    const started = state.clock;
    mark(state, started);

    await assert.rejects(
      signInOnce(
        { ...make(undefined, () => mark(state, state.clock)), waitLimitMs: TOOL_SIGN_IN_WAIT_MS, takeOver: false },
        undefined,
      ),
      { message: SIGN_IN_ELSEWHERE },
    );
    assert.deepEqual(opened, []);
    assert.ok(state.clock - started >= TOOL_SIGN_IN_WAIT_MS);
    assert.ok(state.clock - started < TOOL_SIGN_IN_WAIT_MS + 2 * SIGN_IN_POLL_MS);
  });

  it("gives up on its own browser sign in after the tool cap and frees the marker", async () => {
    const { state, make, opened } = signInWorld(undefined);
    const started = state.clock;

    await assert.rejects(
      signInOnce(
        {
          ...make(() => {
            opened.push(state.clock);
            return new Promise<string>(() => {});
          }),
          waitLimitMs: TOOL_SIGN_IN_WAIT_MS,
          takeOver: false,
          browserLimitMs: TOOL_SIGN_IN_WAIT_MS,
        },
        undefined,
      ),
      { message: SIGN_IN_UNFINISHED },
    );
    assert.doesNotMatch(SIGN_IN_UNFINISHED, /other window/);
    assert.equal(opened.length, 1);
    assert.ok(state.clock - started >= TOOL_SIGN_IN_WAIT_MS);
    assert.equal(state.storage.has(SIGN_IN_KEY), false);

    const later = state.clock;
    assert.equal(await signInOnce(make(), undefined), "access-browser");
    assert.equal(opened.length, 2);
    assert.ok(opened[1] - later < SIGN_IN_POLL_MS);
  });

  it("waits for the token exchange once the user has consented, instead of blaming them", async () => {
    const { state, make } = signInWorld(undefined);

    const token = await signInOnce(
      {
        ...make(),
        sleep: async (ms) => {
          state.clock += ms;
          await new Promise((resolve) => setImmediate(resolve));
        },
        signInWithBrowser: async (consented) => {
          consented();
          await new Promise((resolve) => setTimeout(resolve, 20));
          state.clock += TOOL_SIGN_IN_WAIT_MS * 2;
          return "access-after-slow-exchange";
        },
        waitLimitMs: TOOL_SIGN_IN_WAIT_MS,
        takeOver: false,
        browserLimitMs: TOOL_SIGN_IN_WAIT_MS,
      },
      undefined,
    );

    assert.equal(token, "access-after-slow-exchange");
  });

  it("still opens the browser itself when nobody else is signing in", async () => {
    const { make, opened } = signInWorld(undefined);

    assert.equal(
      await signInOnce({ ...make(), waitLimitMs: TOOL_SIGN_IN_WAIT_MS, takeOver: false }, undefined),
      "access-browser",
    );
    assert.equal(opened.length, 1);
  });
});

describe("signInOnce for Sign in Again", () => {
  it("runs its own consent even when valid tokens are stored", async () => {
    const { state, make, opened } = signInWorld({ accessToken: "access-other", expired: false });
    let removedBeforeBrowser = false;

    const token = await signInOnce(
      {
        ...make(async () => {
          opened.push(state.clock);
          removedBeforeBrowser = state.tokens === undefined;
          return "access-mine";
        }),
        adopt: false,
        beforeBrowser: async () => {
          state.tokens = undefined;
        },
      },
      undefined,
    );

    assert.equal(token, "access-mine");
    assert.equal(opened.length, 1);
    assert.equal(removedBeforeBrowser, true);
  });

  it("waits out another window's sign-in, then still asks for its own consent", async () => {
    const { state, make, opened } = signInWorld(undefined);
    mark(state, state.clock);
    let sleeps = 0;

    const token = await signInOnce(
      {
        ...make(undefined, () => {
          sleeps += 1;
          if (sleeps === 3) {
            state.tokens = { accessToken: "access-other", expired: false };
            state.storage.delete(SIGN_IN_KEY);
          }
        }),
        adopt: false,
      },
      undefined,
    );

    assert.equal(token, "access-browser");
    assert.equal(opened.length, 1);
  });
});

describe("withLease", () => {
  it("runs one holder at a time on jittered storage", async () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const random = seeded(seed);
      const clock = new VirtualClock();
      const values = new Map<string, string>();
      const latency = () => clock.sleep(random() * 60);
      const timing = {
        now: () => clock.now,
        sleep: (ms: number) => clock.sleep(ms),
        random,
        storage: {
          getItem: async (key: string) => {
            await latency();
            return values.get(key);
          },
          setItem: async (key: string, value: string) => {
            await latency();
            values.set(key, value);
          },
          removeItem: async (key: string) => {
            await latency();
            values.delete(key);
          },
        },
      };
      let inside = 0;
      let overlaps = 0;
      const work = async () => {
        inside += 1;
        if (inside > 1) overlaps += 1;
        await clock.sleep(500 + random() * 1000);
        inside -= 1;
      };

      await clock.run(
        Promise.all([
          withLease(timing, "test-lease", work),
          (async () => {
            await clock.sleep(random() * 30);
            return withLease(timing, "test-lease", work);
          })(),
        ]),
      );
      assert.equal(overlaps, 0, `seed ${seed} ran two holders at once`);
    }
  });
});

describe("signInOnce heartbeat failures", () => {
  it("keeps the sign in result and releases the marker when heartbeats fail", async () => {
    const state = world(undefined);
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    const writes: string[] = [];
    let removed = false;
    try {
      const token = await signInOnce(
        {
          readTokens: async () => state.tokens,
          storage: {
            getItem: async (key) => state.storage.get(key),
            setItem: async (key, value) => {
              writes.push(key);
              if (writes.length > 1) throw new Error("storage is full");
              state.storage.set(key, value);
            },
            removeItem: async (key) => {
              removed = true;
              state.storage.delete(key);
            },
          },
          now: () => state.clock,
          sleep: async (ms) => {
            state.clock += ms;
            await new Promise((resolve) => setImmediate(resolve));
          },
          random: () => 0.5,
          signInWithBrowser: async () => {
            for (let tick = 0; tick < 5; tick += 1) await new Promise((resolve) => setImmediate(resolve));
            return "access-browser";
          },
        },
        undefined,
      );
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(token, "access-browser");
      assert.ok(writes.length > 1);
      assert.equal(removed, true);
      assert.deepEqual(unhandled, []);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});

describe("signInOnce across processes", () => {
  it("opens a single browser sign in, however long the consent takes", async () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const outcome = await signInRace(seed);
      assert.equal(outcome.browsers, 1, `seed ${seed} opened ${outcome.browsers} browsers`);
      assert.ok(
        outcome.answers.every((answer) => answer === outcome.answers[0]),
        `seed ${seed} answered ${outcome.answers.join(", ")}`,
      );
      assert.ok(outcome.longestBeatGap < SIGN_IN_STALE_MS, `seed ${seed} let the heartbeat lapse`);
    }
  });
});

describe("token request timeouts", () => {
  it("gives the refresh less time than the lease and the code exchange a full minute", () => {
    assert.ok(REFRESH_TIMEOUT_MS < LEASE_MS - 5_000);
    assert.ok(CODE_EXCHANGE_TIMEOUT_MS >= 60_000);
  });
});
