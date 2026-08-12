import { Cache } from "@raycast/api";
import type { ProviderSnapshot } from "../domain/types";

const CACHE_VERSION = 1;
const CACHE_PREFIX = `provider-status:v${CACHE_VERSION}:`;

export interface StatusCache {
  getSnapshot(providerId: string): ProviderSnapshot | undefined;
  setSnapshot(snapshot: ProviderSnapshot): void;
}

export class RaycastStatusCache implements StatusCache {
  readonly #cache: Cache;

  constructor(cache = new Cache()) {
    this.#cache = cache;
  }

  getSnapshot(providerId: string): ProviderSnapshot | undefined {
    const raw = this.#cache.get(cacheKey(providerId));
    if (!raw) return undefined;

    try {
      const value: unknown = JSON.parse(raw);
      return isProviderSnapshot(value, providerId) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  setSnapshot(snapshot: ProviderSnapshot): void {
    this.#cache.set(cacheKey(snapshot.providerId), JSON.stringify(snapshot));
  }
}

function cacheKey(providerId: string): string {
  return `${CACHE_PREFIX}${providerId}`;
}

function isProviderSnapshot(value: unknown, providerId: string): value is ProviderSnapshot {
  if (!isRecord(value)) return false;

  return (
    value.providerId === providerId &&
    typeof value.health === "string" &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.components) &&
    Array.isArray(value.incidents)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
