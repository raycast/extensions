import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `proper-lockfile` is exercised against a real temp directory (mirrors the
// approach in tests/oauth.test.ts) so the heartbeat/stale/onCompromised code
// paths run through the actual library, not a stub.

const shared = vi.hoisted(() => ({ path: "" }));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return shared.path;
    },
  },
}));

beforeEach(async () => {
  vi.resetModules();
  shared.path = await mkdtemp(join(tmpdir(), "reassign-lock-test-"));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await rm(shared.path, { recursive: true, force: true });
});

it("runs the action under the lock and releases it for the next caller", async () => {
  const { withSessionLock } = await import("../src/lib/session-lock");

  const first = await withSessionLock(async () => "first");
  expect(first).toBe("first");

  // The lockfile is gone after a normal release, so a second caller acquires
  // immediately instead of retrying against a stale lockfile.
  await expect(stat(join(shared.path, "oauth-session.lock"))).rejects.toThrow();
  const second = await withSessionLock(async () => "second");
  expect(second).toBe("second");
});

it("passes an un-aborted AbortSignal to the action on the happy path", async () => {
  const { withSessionLock } = await import("../src/lib/session-lock");

  const result = await withSessionLock(async (signal) => {
    expect(signal.aborted).toBe(false);
    return "ok";
  });
  expect(result).toBe("ok");
});

it("serializes concurrent callers against the shared lockfile", async () => {
  const { withSessionLock } = await import("../src/lib/session-lock");
  const order: string[] = [];

  let signalFirstStarted!: () => void;
  const firstStarted = new Promise<void>((r) => {
    signalFirstStarted = r;
  });
  let finishFirst!: () => void;
  const firstDone = new Promise<void>((r) => {
    finishFirst = r;
  });
  const first = withSessionLock(async () => {
    order.push("first-start");
    signalFirstStarted();
    await firstDone;
    order.push("first-end");
    return "first";
  });
  // Let the first caller enter the lock before the second contends.
  await firstStarted;

  const second = withSessionLock(async () => {
    order.push("second-start");
    order.push("second-end");
    return "second";
  });

  // The second caller is still blocked while the first holds the lock.
  await expect(Promise.race([second, new Promise((r) => setTimeout(() => r("pending"), 50))])).resolves.toBe("pending");

  finishFirst();
  expect(await first).toBe("first");
  expect(await second).toBe("second");
  expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
});

it("rejects a compromised lock with a typed error instead of throwing uncaught, then recovers", async () => {
  const { withSessionLock, SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const lockfile = join(shared.path, "oauth-session.lock");

  // With the buggy default `onCompromised: (err) => { throw err; }`, the throw
  // escapes the wrapper's try/finally from the heartbeat `setTimeout`. An
  // `uncaughtException` listener lets us assert that no longer happens.
  let uncaught = false;
  const onUncaught = () => {
    uncaught = true;
  };
  process.on("uncaughtException", onUncaught);
  try {
    let started!: () => void;
    const startedPromise = new Promise<void>((r) => {
      started = r;
    });
    const holder = withSessionLock(() => {
      started();
      // A long-running action (the real refresh fetch can take its 15 s timeout)
      // that we never resolve, so the lock stays held until the heartbeat fires.
      return new Promise<string>(() => {});
    });
    await startedPromise;

    // Simulate a contender stealing the lock: the holder's heartbeat (first tick
    // at update = stale/2 = 5 s) stats the lockfile and finds an mtime that is
    // no longer its own, so `setLockAsCompromised` invokes our `onCompromised`.
    await utimes(lockfile, new Date(Date.now() - 5000), new Date(Date.now() - 5000));

    await expect(holder).rejects.toBeInstanceOf(SessionLockCompromisedError);
    expect(uncaught).toBe(false);

    // After a compromise the lockfile is left behind (proper-lockfile neither
    // removes it on compromise nor on the ERELEASED release). In a real
    // cross-process run the stealing process owns and eventually releases it;
    // simulate that by clearing the leftover so a fresh call can acquire.
    await rm(lockfile, { recursive: true, force: true });
    const recovered = await withSessionLock(async () => "recovered");
    expect(recovered).toBe("recovered");
  } finally {
    process.off("uncaughtException", onUncaught);
  }
}, 15000);

it("aborts the in-flight action's AbortSignal when the lock is compromised", async () => {
  const { withSessionLock, SessionLockCompromisedError } = await import("../src/lib/session-lock");
  const lockfile = join(shared.path, "oauth-session.lock");

  let started!: () => void;
  const startedPromise = new Promise<void>((r) => {
    started = r;
  });
  // The action mimics the refresh fetch: it awaits something that observes the
  // lock's AbortSignal, so a compromise must abort the in-flight work (and the
  // holder must reject with the typed error), rather than letting it complete
  // or leaving the action hanging.
  const holder = withSessionLock((signal) => {
    started();
    return new Promise<string>((_, reject) => {
      if (signal.aborted) return reject(signal.reason);
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
  await startedPromise;

  await utimes(lockfile, new Date(Date.now() - 5000), new Date(Date.now() - 5000));
  await expect(holder).rejects.toBeInstanceOf(SessionLockCompromisedError);
}, 15000);
