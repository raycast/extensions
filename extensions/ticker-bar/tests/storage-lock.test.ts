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

  await new Promise((resolve) => setTimeout(resolve, 140));
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
