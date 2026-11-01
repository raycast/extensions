/**
 * Tenant-scoped cache and request cancellation manager (`AUTH-02`).
 *
 * Security invariants:
 * 1. Every cache entry and in-flight request is bound to a SHA-256 fingerprint
 *    of `(normalizedBaseUrl + "\0" + apiKey)`. Raw API keys are never stored
 *    as cache keys, logged, or exposed in UI metadata.
 * 2. Switching credentials or base URL atomically aborts all in-flight
 *    `AbortController` instances from the prior tenant and purges all cached
 *    records, preventing cross-workspace data leakage even during slow network
 *    responses.
 * 3. Rapid search queries under the same key automatically abort the previous
 *    in-flight request for that logical slot.
 */

import { createHash } from "node:crypto";

export const DEFAULT_API_BASE_URL = "https://api.frihet.io/v1";
const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES_PER_TENANT = 100;

export function normalizeApiBaseUrl(rawUrl?: string): string {
  const trimmed = (rawUrl ?? "").trim();
  const base = trimmed.length > 0 ? trimmed : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/u, "");
}

/**
 * Returns a 16-character hex SHA-256 fingerprint of `(baseUrl, apiKey)`.
 * Irreversible and safe to display in diagnostics (`Workspace & Cache Status`).
 */
export function computeTenantNamespace(
  apiBaseUrl: string | undefined,
  apiKey: string,
): string {
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl);
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return "unauthenticated";
  }
  return createHash("sha256")
    .update(`frihet-raycast-tenant-v1\0${normalizedBase}\0${cleanKey}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

export interface TenantCacheStats {
  activeNamespace: string | null;
  generation: number;
  cachedEntryCount: number;
  inFlightCount: number;
}

export class TenantScopedCache {
  private activeNamespace: string | null = null;
  private generation = 0;
  private readonly store = new Map<string, Map<string, CacheEntry<unknown>>>();
  private readonly inFlight = new Map<string, Map<string, AbortController>>();
  private readonly ttlMs: number;
  private readonly nowFn: () => number;

  constructor(options?: { ttlMs?: number; now?: () => number }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.nowFn = options?.now ?? Date.now;
  }

  /**
   * Ensures `namespace` is the active tenant context. If the tenant fingerprint
   * changed since the last operation, atomically aborts all in-flight requests
   * and purges all cached entries before activating the new namespace.
   */
  activateNamespace(namespace: string): {
    switched: boolean;
    generation: number;
  } {
    if (this.activeNamespace !== null && this.activeNamespace !== namespace) {
      this.purgeAll("workspace_switched");
    }
    this.activeNamespace = namespace;
    return { switched: false, generation: this.generation };
  }

  /**
   * Atomically aborts all in-flight requests and clears all cached records.
   */
  purgeAll(reason = "manual_clear"): void {
    this.generation += 1;
    for (const controllers of this.inFlight.values()) {
      for (const controller of controllers.values()) {
        try {
          controller.abort(new Error(`Aborted: ${reason}`));
        } catch {
          controller.abort();
        }
      }
      controllers.clear();
    }
    this.inFlight.clear();
    this.store.clear();
  }

  /**
   * Starts a tracked in-flight request for `(namespace, slotKey)`.
   * - If `namespace` differs from the active namespace, switches namespaces
   *   first (purging old tenant state).
   * - If a previous request is still running for `slotKey`, aborts it first.
   */
  beginRequest(
    namespace: string,
    slotKey: string,
  ): {
    controller: AbortController;
    generation: number;
    complete: () => void;
  } {
    this.activateNamespace(namespace);
    const generationAtStart = this.generation;

    let tenantControllers = this.inFlight.get(namespace);
    if (!tenantControllers) {
      tenantControllers = new Map<string, AbortController>();
      this.inFlight.set(namespace, tenantControllers);
    }

    const existing = tenantControllers.get(slotKey);
    if (existing) {
      try {
        existing.abort(new Error("Superseded by newer search request"));
      } catch {
        existing.abort();
      }
      tenantControllers.delete(slotKey);
    }

    const controller = new AbortController();
    tenantControllers.set(slotKey, controller);

    const complete = (): void => {
      const map = this.inFlight.get(namespace);
      if (map && map.get(slotKey) === controller) {
        map.delete(slotKey);
      }
    };

    return { controller, generation: generationAtStart, complete };
  }

  /**
   * Reads a cached value only if `namespace` matches the active tenant and the
   * entry has not expired.
   */
  get<T>(namespace: string, key: string): T | undefined {
    if (namespace === "unauthenticated" || this.activeNamespace !== namespace) {
      return undefined;
    }
    const tenantMap = this.store.get(namespace);
    if (!tenantMap) return undefined;
    const entry = tenantMap.get(key);
    if (!entry) return undefined;
    if (this.nowFn() > entry.expiresAt) {
      tenantMap.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /**
   * Writes a value into the cache only if `namespace` is still the active
   * tenant and `expectedGeneration` (when supplied) matches the current
   * cache generation. This prevents a late response from Tenant A from writing
   * after a switch to Tenant B.
   */
  set<T>(
    namespace: string,
    key: string,
    value: T,
    expectedGeneration?: number,
  ): boolean {
    if (namespace === "unauthenticated") return false;
    if (
      expectedGeneration !== undefined &&
      expectedGeneration !== this.generation
    ) {
      return false;
    }
    this.activateNamespace(namespace);
    if (this.activeNamespace !== namespace) {
      return false;
    }

    let tenantMap = this.store.get(namespace);
    if (!tenantMap) {
      tenantMap = new Map<string, CacheEntry<unknown>>();
      this.store.set(namespace, tenantMap);
    }

    if (tenantMap.size >= MAX_ENTRIES_PER_TENANT && !tenantMap.has(key)) {
      const oldestKey = tenantMap.keys().next().value;
      if (oldestKey !== undefined) {
        tenantMap.delete(oldestKey);
      }
    }

    const now = this.nowFn();
    tenantMap.set(key, {
      value,
      storedAt: now,
      expiresAt: now + this.ttlMs,
    });
    return true;
  }

  getStats(): TenantCacheStats {
    const active = this.activeNamespace;
    const cachedEntryCount = active ? (this.store.get(active)?.size ?? 0) : 0;
    const inFlightCount = active ? (this.inFlight.get(active)?.size ?? 0) : 0;
    return {
      activeNamespace: active,
      generation: this.generation,
      cachedEntryCount,
      inFlightCount,
    };
  }
}

export const globalTenantCache = new TenantScopedCache();
export { TenantScopedCache as WorkspaceRegistry };
