import { assertProviderSnapshot } from "../domain/snapshot-validation";
import type { ProviderSnapshot } from "../domain/types";

const CACHE_VERSION = 2;
const CACHE_PREFIX = `provider-status:v${CACHE_VERSION}:`;

export interface StatusCache {
  getSnapshot(providerId: string): ProviderSnapshot | undefined;
  setSnapshot(snapshot: ProviderSnapshot): void;
}

export class SnapshotCache implements StatusCache {
  readonly #cache: { get(key: string): string | undefined; set(key: string, value: string): void };

  constructor(cache: { get(key: string): string | undefined; set(key: string, value: string): void }) {
    this.#cache = cache;
  }

  getSnapshot(providerId: string): ProviderSnapshot | undefined {
    const raw = this.#cache.get(cacheKey(providerId));
    if (!raw) return undefined;

    try {
      const value: unknown = JSON.parse(raw);
      assertProviderSnapshot(value, providerId);
      return value;
    } catch {
      return undefined;
    }
  }

  setSnapshot(snapshot: ProviderSnapshot): void {
    assertProviderSnapshot(snapshot, snapshot.providerId);
    this.#cache.set(cacheKey(snapshot.providerId), JSON.stringify(snapshot));
  }
}

function cacheKey(providerId: string): string {
  return `${CACHE_PREFIX}${providerId}`;
}
