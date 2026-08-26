import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderSnapshot } from "../src/domain/types";
import type { ProviderDefinition } from "../src/providers/types";
import { refreshProviderStatus } from "../src/services/fetch-provider-statuses";
import { ProviderRequestOrder } from "../src/services/provider-request-order";

class MemoryCache {
  readonly snapshots = new Map<string, ProviderSnapshot>();

  getSnapshot(providerId: string) {
    return this.snapshots.get(providerId);
  }

  setSnapshot(snapshot: ProviderSnapshot) {
    this.snapshots.set(snapshot.providerId, snapshot);
  }
}

test("an older provider refresh cannot persist after a newer refresh", async () => {
  const cache = new MemoryCache();
  const order = new ProviderRequestOrder();
  const responses: Array<(snapshot: ProviderSnapshot) => void> = [];
  const provider = providerWithFetch(() => new Promise<ProviderSnapshot>((resolve) => responses.push(resolve)));

  const olderToken = order.begin(provider.id);
  const older = refreshProviderStatus(provider, {
    cache,
    force: true,
    isCurrent: () => order.isCurrent(provider.id, olderToken),
  });
  const newerToken = order.begin(provider.id);
  const newer = refreshProviderStatus(provider, {
    cache,
    force: true,
    isCurrent: () => order.isCurrent(provider.id, newerToken),
  });

  responses[1]?.(snapshot("2026-08-12T05:00:00Z"));
  await newer;
  responses[0]?.(snapshot("2026-08-12T04:00:00Z"));
  await older;

  assert.equal(cache.getSnapshot(provider.id)?.fetchedAt, "2026-08-12T05:00:00Z");
  assert.equal(order.isCurrent(provider.id, olderToken), false);
  assert.equal(order.isCurrent(provider.id, newerToken), true);
});

function providerWithFetch(fetchSnapshot: () => Promise<ProviderSnapshot>): ProviderDefinition {
  return {
    id: "example",
    name: "Example",
    aliases: [],
    category: "model-providers",
    preferenceKey: "showExample",
    icon: "provider-icons/example.png",
    statusPageUrl: "https://status.example.com/",
    adapter: { fetch: fetchSnapshot },
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
