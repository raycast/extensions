import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import type { ComponentHistory, ProviderSnapshot } from "../src/domain/types";
import type { ProviderDefinition } from "../src/providers/types";
import { ProviderStatusStore } from "../src/services/provider-status-store";

const NOW = Date.parse("2026-09-10T16:00:00Z");
const history: ComponentHistory = {
  basis: "incidents",
  windowDays: 1,
  days: [{ date: "2026-09-10", level: "operational" }],
};

test("multiple views observe the same current record when an individual refresh supersedes bulk work", async () => {
  const calls: Array<{ response: ReturnType<typeof deferred<ProviderSnapshot>>; signal: AbortSignal }> = [];
  const provider = definition(async (signal) => {
    const response = deferred<ProviderSnapshot>();
    calls.push({ response, signal });
    return response.promise;
  });
  const cache = new MemoryCache();
  const store = new ProviderStatusStore([provider], cache, { now: () => NOW });
  const rootRecords: unknown[] = [],
    detailRecords: unknown[] = [];
  const unsubscribeRoot = store.subscribe(() => rootRecords.push(store.getSnapshot().records.example));
  const unsubscribeDetail = store.subscribe(() => detailRecords.push(store.getSnapshot().records.example));
  const bulk = store.refreshAll();
  const single = store.refreshProvider("example");
  assert.equal(calls[0]!.signal.aborted, true);
  const newer = snapshot(NOW);
  calls[1]!.response.resolve(newer);
  await single;
  calls[0]!.response.resolve(snapshot(NOW - 60_000));
  await bulk;
  assert.equal(cache.getSnapshot("example"), newer);
  assert.equal(store.getSnapshot().records.example?.snapshot, newer);
  assert.equal(rootRecords.at(-1), detailRecords.at(-1));
  assert.equal(store.getSnapshot().isRefreshing, false);
  unsubscribeRoot();
  unsubscribeDetail();
  store.cancel();
});

test("a bulk refresh supersedes individual work and cancelled queued providers never start", async () => {
  const responses: Array<ReturnType<typeof deferred<ProviderSnapshot>>> = [];
  const provider = definition(async () => {
    const response = deferred<ProviderSnapshot>();
    responses.push(response);
    return response.promise;
  });
  let queuedCalls = 0;
  const queued = {
    ...provider,
    id: "queued",
    adapter: {
      fetch: async () => {
        queuedCalls++;
        return { ...snapshot(NOW), providerId: "queued" };
      },
    },
  };
  const cache = new MemoryCache();
  const store = new ProviderStatusStore([provider, queued], cache, { now: () => NOW, concurrency: 1 });
  const single = store.refreshProvider("example");
  const bulk = store.refreshAll();
  responses[0]!.resolve(snapshot(NOW - 60_000));
  assert.equal(await single, undefined);
  store.cancel();
  responses[1]!.resolve(snapshot(NOW));
  await bulk;
  assert.equal(queuedCalls, 0);
  assert.equal(cache.getSnapshot("example"), undefined);
  assert.equal(store.getSnapshot().isRefreshing, false);
});

test("fresh cached records skip automatic requests and a failed refresh keeps the last snapshot", async () => {
  let calls = 0;
  const provider = definition(async () => {
    calls++;
    throw new Error("Offline");
  });
  const cache = new MemoryCache();
  cache.setSnapshot(snapshot(NOW));
  const store = new ProviderStatusStore([provider], cache, { now: () => NOW });
  await store.refreshAll(false);
  assert.equal(calls, 0);
  await store.refreshProvider("example");
  assert.equal(calls, 1);
  assert.equal(store.getSnapshot().records.example?.snapshot, cache.getSnapshot("example"));
  assert.equal(store.getSnapshot().records.example?.refreshState, "failed");
  store.cancel();
});

test("history requests are shared between views and cancelled when their last view closes", async () => {
  const responses: Array<ReturnType<typeof deferred<ComponentHistory>>> = [];
  const signals: AbortSignal[] = [];
  const provider = definition(async () => snapshot(NOW));
  provider.adapter.fetchComponentHistory = async (_id, signal) => {
    signals.push(signal);
    const response = deferred<ComponentHistory>();
    responses.push(response);
    return response.promise;
  };
  const cache = new MemoryCache();
  cache.setSnapshot(snapshot(NOW));
  const store = new ProviderStatusStore([provider], cache, { now: () => NOW });
  const closeFirst = store.watchComponentHistory("example", "api");
  const closeSecond = store.watchComponentHistory("example", "api");
  assert.equal(responses.length, 1);
  closeFirst();
  assert.equal(signals[0]!.aborted, false);
  closeSecond();
  assert.equal(signals[0]!.aborted, true);
  const closeNew = store.watchComponentHistory("example", "api");
  responses[0]!.resolve({ ...history, basis: "availability" });
  responses[1]!.resolve(history);
  await setImmediate();
  assert.equal(store.getComponentHistory("example", "api").history, history);
  closeNew();
  const revisit = store.watchComponentHistory("example", "api");
  assert.equal(responses.length, 2);
  revisit();
  store.cancel();
});

test("a stalled lazy history request times out and can be retried on the next selection", async () => {
  let calls = 0;
  const provider = definition(async () => snapshot(NOW));
  provider.adapter.fetchComponentHistory = async () => {
    calls++;
    if (calls === 1) return new Promise(() => {});
    return history;
  };
  const cache = new MemoryCache();
  cache.setSnapshot(snapshot(NOW));
  const store = new ProviderStatusStore([provider], cache, { now: () => NOW, historyTimeoutMs: 5 });
  const completed = new Promise<void>((resolve) => {
    const unsubscribe = store.subscribe(() => {
      if (store.getComponentHistory("example", "api").availability === "unavailable") {
        unsubscribe();
        resolve();
      }
    });
  });
  const close = store.watchComponentHistory("example", "api");
  await completed;
  assert.equal(store.getComponentHistory("example", "api").isLoading, false);
  close();
  const closeRetry = store.watchComponentHistory("example", "api");
  await setImmediate();
  assert.equal(store.getComponentHistory("example", "api").availability, "available");
  closeRetry();
  store.cancel();
});

test("refresh invalidates old history and late responses cannot attach to the new snapshot", async () => {
  const pending = deferred<ComponentHistory>();
  let calls = 0;
  const provider = definition(async () => snapshot(NOW + 1_000));
  provider.adapter.fetchComponentHistory = async () => {
    calls++;
    return calls === 1 ? pending.promise : history;
  };
  const cache = new MemoryCache();
  cache.setSnapshot(snapshot(NOW));
  const store = new ProviderStatusStore([provider], cache, { now: () => NOW });
  const closeOld = store.watchComponentHistory("example", "api");
  await store.refreshProvider("example");
  assert.equal(store.getComponentHistory("example", "api").history, undefined);
  const closeNew = store.watchComponentHistory("example", "api");
  closeOld();
  pending.resolve({ ...history, basis: "availability" });
  await setImmediate();
  assert.equal(store.getComponentHistory("example", "api").history, history);
  closeNew();
  store.cancel();
});

function definition(fetch: ProviderDefinition["adapter"]["fetch"]): ProviderDefinition {
  return {
    id: "example",
    name: "Example",
    aliases: [],
    category: "model-providers",
    preferenceKey: "showExample",
    icon: "icon.png",
    statusPageUrl: "https://status.example.com/",
    adapter: { fetch },
  };
}

function snapshot(time: number): ProviderSnapshot {
  return {
    providerId: "example",
    health: "operational",
    fetchedAt: new Date(time).toISOString(),
    components: [{ id: "api", name: "API", health: "operational" }],
    incidents: [],
  };
}

class MemoryCache {
  readonly snapshots = new Map<string, ProviderSnapshot>();
  getSnapshot(id: string) {
    return this.snapshots.get(id);
  }
  setSnapshot(value: ProviderSnapshot) {
    this.snapshots.set(value.providerId, value);
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
