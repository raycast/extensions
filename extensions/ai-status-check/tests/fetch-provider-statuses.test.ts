import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderSnapshot } from "../src/domain/types";
import type { ProviderDefinition } from "../src/providers/types";
import { fetchOptionalEnrichment } from "../src/providers/utils/optional-enrichment";
import { refreshProviderStatus } from "../src/services/fetch-provider-statuses";

class MemoryCache {
  readonly snapshots = new Map<string, ProviderSnapshot>();

  getSnapshot(providerId: string) {
    return this.snapshots.get(providerId);
  }

  setSnapshot(snapshot: ProviderSnapshot) {
    this.snapshots.set(snapshot.providerId, snapshot);
  }
}

test("a failed refresh retains the last successful snapshot", async () => {
  const cache = new MemoryCache();
  const cached = snapshot("2026-08-11T15:00:00Z");
  cache.setSnapshot(cached);

  const result = await refreshProviderStatus(failingProvider(), {
    cache,
    force: true,
    now: () => Date.parse("2026-08-11T16:00:00Z"),
  });

  assert.equal(result.snapshot, cached);
  assert.equal(result.freshness, "stale");
  assert.equal(result.refreshState, "failed");
  assert.match(result.refreshError ?? "", /source unavailable/);
  assert.equal(cache.getSnapshot("example"), cached);
});

test("a fresh cache avoids a provider request unless refresh is forced", async () => {
  const cache = new MemoryCache();
  const cached = snapshot("2026-08-11T15:59:30Z");
  cache.setSnapshot(cached);
  let calls = 0;
  const provider = providerWithFetch(async () => {
    calls += 1;
    return snapshot("2026-08-11T16:00:00Z");
  });

  const result = await refreshProviderStatus(provider, {
    cache,
    now: () => Date.parse("2026-08-11T16:00:00Z"),
  });

  assert.equal(calls, 0);
  assert.equal(result.snapshot, cached);
  assert.equal(result.refreshState, "idle");
});

test("an optional enrichment timeout does not discard completed core status", async () => {
  const cache = new MemoryCache();
  const provider = providerWithFetch(async (signal) => {
    await fetchOptionalEnrichment(
      signal,
      (historySignal) =>
        new Promise((_resolve, reject) =>
          historySignal.addEventListener("abort", () => reject(historySignal.reason), { once: true }),
        ),
      1_000,
    );
    return snapshot("2026-08-11T16:00:00Z");
  });

  const result = await refreshProviderStatus(provider, { cache, force: true, timeoutMs: 20 });

  assert.equal(result.refreshState, "idle");
  assert.equal(result.snapshot?.health, "operational");
});

function failingProvider(): ProviderDefinition {
  return providerWithFetch(async () => {
    throw new Error("source unavailable");
  });
}

function providerWithFetch(fetchSnapshot: (signal: AbortSignal) => Promise<ProviderSnapshot>): ProviderDefinition {
  return {
    id: "example",
    name: "Example",
    aliases: [],
    category: "model-providers",
    preferenceKey: "showExample",
    icon: "provider-icons/example.png",
    statusPageUrl: "https://status.example.com/",
    adapter: {
      fetch: fetchSnapshot,
    },
  };
}

function snapshot(fetchedAt: string): ProviderSnapshot {
  return {
    providerId: "example",
    health: "operational",
    components: [],
    incidents: [],
    fetchedAt,
  };
}
