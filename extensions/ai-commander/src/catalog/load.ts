import { errorMessage } from "../core/errors";
import type { CatalogEntry, ProviderId, RawModel } from "../core/types";
import { buildCatalog, PROVIDER_IDS, type RawByProvider } from "./build";
import { createCatalogStore, type CatalogStore } from "./cache";
import { visibleEntries } from "./routing";

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type ApiKeys = Partial<Record<ProviderId, string>>;

/** Fetches one provider's raw model list. Injectable so tests need no network and no providers module. */
export type ModelFetcher = (provider: ProviderId, apiKey: string, signal?: AbortSignal) => Promise<RawModel[]>;

export interface CatalogLoadResult {
  entries: CatalogEntry[];
  /** Providers that were fetched in this call. */
  refreshed: ProviderId[];
  /** Per-provider failure messages (already stripped of secrets). Their previous entries are kept. */
  errors: Partial<Record<ProviderId, string>>;
}

export interface LoadOptions {
  keys: ApiKeys;
  /** Ignore the 24 h interval ("Refresh Models"). */
  force?: boolean;
  signal?: AbortSignal;
}

export interface LoaderDeps {
  fetchModels: ModelFetcher;
  store: CatalogStore;
  now: () => number;
}

/** Production wiring. The providers module is imported lazily so catalog code stays testable on its own. */
const defaultFetcher: ModelFetcher = async (provider, apiKey, signal) => {
  const { getProfile, getAdapter } = await import("../providers");
  const profile = getProfile(provider);
  return getAdapter(profile).listModels(profile, apiKey, signal);
};

export function createCatalogLoader(
  overrides: Partial<LoaderDeps> = {},
): (options: LoadOptions) => Promise<CatalogLoadResult> {
  const deps: LoaderDeps = {
    fetchModels: overrides.fetchModels ?? defaultFetcher,
    store: overrides.store ?? createCatalogStore(),
    now: overrides.now ?? Date.now,
  };
  const inFlight = new Map<string, Promise<CatalogLoadResult>>();

  async function run({ keys, force = false, signal }: LoadOptions): Promise<CatalogLoadResult> {
    const snapshot = deps.store.read();
    const now = deps.now();
    const withKey = PROVIDER_IDS.filter((id) => (keys[id] ?? "") !== "");
    // Providers whose key was removed drop out of the catalog; nothing could be fetched for them anyway.
    const previous = snapshot.entries.filter((entry) => withKey.includes(entry.ref.provider));
    const fetchedAt = { ...snapshot.fetchedAt };
    for (const id of PROVIDER_IDS) if (!withKey.includes(id)) delete fetchedAt[id];

    const due = withKey.filter((id) => {
      const last = fetchedAt[id];
      // A future timestamp (clock change) is treated as stale instead of trusting it forever.
      return force || last === undefined || last > now || now - last >= STALE_AFTER_MS;
    });

    const raw: RawByProvider = {};
    const errors: CatalogLoadResult["errors"] = {};
    await Promise.all(
      due.map(async (id) => {
        try {
          raw[id] = await deps.fetchModels(id, keys[id] ?? "", signal);
          fetchedAt[id] = now;
        } catch (error) {
          errors[id] = errorMessage(error);
        }
      }),
    );

    const entries = buildCatalog(raw, previous);
    // The store keeps both routes, so a key change takes effect at once, without a new download.
    deps.store.write({ entries, fetchedAt });
    return { entries: visibleEntries(entries, keys), refreshed: due.filter((id) => raw[id] !== undefined), errors };
  }

  return (options) => {
    // Concurrent callers (several forms opening at once) share one network round trip.
    const providers = PROVIDER_IDS.filter((id) => (options.keys[id] ?? "") !== "").join(",");
    const key = `${options.force === true}|${providers}`;
    const existing = inFlight.get(key);
    if (existing !== undefined) return existing;
    const promise = run(options).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}

/** Loads the catalog with production wiring. */
export const loadCatalog = createCatalogLoader();
