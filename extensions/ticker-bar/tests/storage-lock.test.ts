import assert from "node:assert/strict";
import test from "node:test";
import { LeaseStorage, withLeaseLock } from "../src/storage-lock";

function memoryStorage(): LeaseStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key),
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test("a heartbeat keeps a lease owned beyond its initial expiry", async () => {
  const storage = memoryStorage();
  let releaseFirst: (() => void) | undefined;
  const firstCanFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = withLeaseLock(storage, "refresh", () => firstCanFinish, {
    leaseMs: 80,
    heartbeatMs: 20,
    waitTimeoutMs: 20,
    retryMs: 5,
  });

  await wait(140);
  await assert.rejects(
    withLeaseLock(storage, "refresh", async () => undefined, {
      leaseMs: 80,
      heartbeatMs: 20,
      waitTimeoutMs: 30,
      retryMs: 5,
    }),
    /Another Ticker Bar operation is already running/,
  );

  releaseFirst?.();
  await first;
});

test("completed work still returns after heartbeat lease loss", async () => {
  const storage = memoryStorage();
  const key = "refresh";

  const result = await withLeaseLock(
    storage,
    key,
    async (signal) => {
      // Steal the lease so the next heartbeat aborts the holder.
      await storage.setItem(key, `intruder|${Date.now() + 60_000}`);
      await wait(40);
      assert.equal(signal.aborted, true);
      return "committed";
    },
    {
      leaseMs: 80,
      heartbeatMs: 15,
      waitTimeoutMs: 20,
      retryMs: 5,
    },
  );

  assert.equal(result, "committed");
  // Intruder still owns the lease; holder must not clear a foreign lock.
  const latest = await storage.getItem(key);
  assert.ok(latest?.startsWith("intruder|"));
});

test("a completed lease does not block the next operation", async () => {
  const storage = memoryStorage();
  const key = "refresh";

  await withLeaseLock(storage, key, async () => undefined, {
    leaseMs: 500,
    heartbeatMs: 20,
    waitTimeoutMs: 20,
    retryMs: 5,
  });

  let ran = false;
  await withLeaseLock(
    storage,
    key,
    async () => {
      ran = true;
    },
    {
      leaseMs: 500,
      heartbeatMs: 20,
      waitTimeoutMs: 20,
      retryMs: 5,
    },
  );

  assert.equal(ran, true);
});

test("concurrent acquires never run protected work at the same time", async () => {
  const values = new Map<string, string>();
  const storage: LeaseStorage = {
    getItem: async (key) => values.get(key),
    setItem: async (key, value) => {
      await wait(20);
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };

  let running = 0;
  let maxRunning = 0;
  const work = async () => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await wait(40);
    running -= 1;
  };

  const results = await Promise.allSettled([
    withLeaseLock(storage, "refresh", work, {
      leaseMs: 500,
      heartbeatMs: 50,
      waitTimeoutMs: 400,
      retryMs: 10,
      contentionMs: 25,
    }),
    withLeaseLock(storage, "refresh", work, {
      leaseMs: 500,
      heartbeatMs: 50,
      waitTimeoutMs: 400,
      retryMs: 10,
      contentionMs: 25,
    }),
  ]);

  assert.equal(maxRunning, 1);
  assert.ok(results.some((result) => result.status === "fulfilled"));
});
