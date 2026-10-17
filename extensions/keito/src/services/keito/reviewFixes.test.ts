// Regression tests for the review of raycast/extensions#32442.
import { mkdtempSync, mkdirSync, utimesSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { KeitoHttpClient, FetchLike } from "./http";
import { fileLock, Lock } from "./lock";
import { KEITO_OAUTH, KeitoOAuth, StoredTokens, TokenStore } from "./oauth";
import { makeApi, page, TEST_ACCOUNT, TEST_TOKEN } from "./testUtils";
import { assertTaskOnProject } from "./workflows";

const NOW = 1_800_000_000_000;

function sharedStore(initial: StoredTokens): TokenStore & { value?: StoredTokens } {
  const store = {
    value: { ...initial } as StoredTokens | undefined,
    async get() {
      await new Promise((r) => setTimeout(r, 1));
      return store.value ? { ...store.value } : undefined;
    },
    async set(tokens: StoredTokens) {
      await new Promise((r) => setTimeout(r, 1));
      store.value = { ...tokens };
    },
    async remove() {
      store.value = undefined;
    },
  };
  return store;
}

/** A token endpoint that rotates refresh tokens and rejects reuse, like WorkOS. */
function rotatingEndpoint(valid: string) {
  let current = valid;
  let n = 0;
  const calls: string[] = [];
  const fetch: FetchLike = async (_url, init) => {
    const params = Object.fromEntries(new URLSearchParams(init.body ?? ""));
    calls.push(params.refresh_token);
    await new Promise((r) => setTimeout(r, 5)); // network latency, so requests overlap
    if (params.refresh_token !== current) {
      return { status: 400, headers: { get: () => null }, text: async () => '{"error":"invalid_grant"}' };
    }
    n++;
    current = `refresh-${n}`;
    const body = { access_token: `access-${n}`, refresh_token: current, expires_in: 300 };
    return { status: 200, headers: { get: () => null }, text: async () => JSON.stringify(body) };
  };
  return { fetch, calls };
}

describe("token refresh across Raycast commands (review #1)", () => {
  const expired: StoredTokens = { accessToken: "access-0", refreshToken: "refresh-0", expiresAt: NOW - 1 };

  it("lets only one command refresh; the others reuse its rotated tokens", async () => {
    const store = sharedStore(expired);
    const endpoint = rotatingEndpoint("refresh-0");
    const lock = fileLock(join(mkdtempSync(join(tmpdir(), "keito-lock-")), "support", "oauth-refresh.lock"), {
      pollMs: 2,
    });
    // Separate instances simulate separate command processes (no shared in-memory promise).
    const commands = [1, 2, 3].map(() => new KeitoOAuth({ store, fetch: endpoint.fetch, lock, now: () => NOW }));
    const tokens = await Promise.all(commands.map((c) => c.getAccessToken({ interactive: false })));
    expect(endpoint.calls).toEqual(["refresh-0"]);
    expect(tokens).toEqual(["access-1", "access-1", "access-1"]);
    expect(store.value?.refreshToken).toBe("refresh-1");
  });

  it("a forced refresh after a 401 reuses tokens another command already rotated", async () => {
    const store = sharedStore({ accessToken: "access-0", refreshToken: "refresh-0", expiresAt: NOW + 200_000 });
    const endpoint = rotatingEndpoint("refresh-0");
    let first = true;
    const lock: Lock = async (fn) => {
      if (first) {
        first = false;
        // Another command rotates the tokens while this one waits for the lock.
        store.value = { accessToken: "access-other", refreshToken: "refresh-other", expiresAt: NOW + 300_000 };
      }
      return fn();
    };
    const oauth = new KeitoOAuth({ store, fetch: endpoint.fetch, lock, now: () => NOW });
    expect(await oauth.provider({ interactive: false }).onUnauthorized?.()).toBe(true);
    expect(endpoint.calls).toEqual([]);
    expect(store.value?.accessToken).toBe("access-other");
  });
});

describe("fileLock", () => {
  const lockPath = () => join(mkdtempSync(join(tmpdir(), "keito-lock-")), "oauth.lock");

  it("never runs two critical sections at once and always releases", async () => {
    const lock = fileLock(lockPath(), { pollMs: 1 });
    let active = 0;
    let maxActive = 0;
    const section = async (fail: boolean) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 3));
      active--;
      if (fail) throw new Error("boom");
    };
    const results = await Promise.allSettled([false, true, false, true, false].map((f) => lock(() => section(f))));
    expect(maxActive).toBe(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(2);
  });

  it("takes over a lock left behind by a crashed command", async () => {
    const path = lockPath();
    mkdirSync(path);
    const old = new Date(Date.now() - 60_000);
    utimesSync(path, old, old);
    expect(await fileLock(path, { staleMs: 30_000 })(async () => "ran")).toBe("ran");
    expect(existsSync(path)).toBe(false);
  });

  it("gives up with a clear error while a live lock is held", async () => {
    const path = lockPath();
    mkdirSync(path);
    await expect(
      fileLock(path, { staleMs: 60_000, timeoutMs: 30, pollMs: 5 })(async () => "ran"),
    ).rejects.toMatchObject({
      kind: "timeout",
    });
  });
});

describe("reusing a saved project/task pair (review #4)", () => {
  it("rejects a task that is no longer assigned to the project", async () => {
    const { api, calls } = makeApi({
      "GET /api/v2/tasks": page("tasks", [{ id: "t-current", name: "Design" }]),
    });
    const pair = { projectId: "p1", projectName: "Website", taskId: "t-removed", taskName: "Old task" };
    await expect(assertTaskOnProject(api, pair, "Choose another task.")).rejects.toMatchObject({
      kind: "validation",
      message: "“Old task” is no longer assigned to Website. Choose another task.",
    });
    expect(calls[0].url.searchParams.get("project_id")).toBe("p1");
    await expect(assertTaskOnProject(api, { ...pair, taskId: "t-current" }, "")).resolves.toBeUndefined();
  });
});

describe("request timeout covers the response body (review #8)", () => {
  it("times out when headers arrive but the body stalls", async () => {
    const fetch: FetchLike = async (_url, init) => ({
      status: 200,
      headers: { get: () => null },
      text: () =>
        new Promise<string>((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    });
    const http = new KeitoHttpClient({
      token: TEST_TOKEN,
      accountId: TEST_ACCOUNT,
      fetch,
      timeoutMs: 20,
      maxRetries: 0,
    });
    await expect(http.request("POST", "/time_entries", { body: {} })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("times out on a stalled token response instead of treating it as empty", async () => {
    const fetch: FetchLike = async (_url, init) => ({
      status: 200,
      headers: { get: () => null },
      text: () =>
        new Promise<string>((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    });
    const store = sharedStore({ accessToken: "a", refreshToken: "r", expiresAt: NOW - 1 });
    const oauth = new KeitoOAuth({ store, fetch, now: () => NOW, timeoutMs: 20, config: KEITO_OAUTH });
    await expect(oauth.getAccessToken({ interactive: false })).rejects.toMatchObject({ kind: "timeout" });
    expect(store.value?.refreshToken).toBe("r");
  });
});

void vi;
