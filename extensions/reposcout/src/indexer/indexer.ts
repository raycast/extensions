import { INDEX_SCHEMA_VERSION, type IndexingProgress, type RepositoryIndex } from "../types/index-state";
import type { DiscoveredRepository, RepositoryRecord } from "../types/repository";
import type { IndexStore } from "../cache/index-store";
import { discoverRepositories, type DiscoveryOptions } from "../filesystem/discovery";
import { readRepositoryGitInfo, type ReadGitInfoOptions } from "../git/info";
import { mapWithConcurrency } from "../utils/async";
import { createLogger } from "../utils/logger";
import { planEnrichment } from "./reconcile";

const log = createLogger("indexer");

/** How many repositories to enrich with Git metadata concurrently. */
const DEFAULT_CONCURRENCY = 8;

/** Dependencies and options for an index refresh. */
export interface RefreshDeps {
  /** Filesystem discovery configuration. */
  readonly discovery: DiscoveryOptions;
  /** Where the index is persisted. */
  readonly store: IndexStore;
  /** Max concurrent git enrichments. Defaults to {@link DEFAULT_CONCURRENCY}. */
  readonly concurrency?: number;
  /** Git reader options (e.g. an injected runner for tests). */
  readonly gitOptions?: ReadGitInfoOptions;
  /** Clock, injected for deterministic tests. Defaults to `Date.now`. */
  readonly now?: () => number;
  /** Progress callback for the UI. */
  readonly onProgress?: (progress: IndexingProgress) => void;
  /** Abort signal to cancel a long refresh. */
  readonly signal?: AbortSignal;
}

/** Build a `path → record` lookup from an index. */
function indexByPath(index: RepositoryIndex | null): Map<string, RepositoryRecord> {
  const map = new Map<string, RepositoryRecord>();
  if (index) {
    for (const record of index.records) {
      map.set(record.path, record);
    }
  }
  return map;
}

/** Enrich a single discovered repository into a full record. */
async function enrichOne(
  repo: DiscoveredRepository,
  nowMs: number,
  gitOptions: ReadGitInfoOptions | undefined,
): Promise<RepositoryRecord> {
  const gitInfo = await readRepositoryGitInfo(repo.path, repo.kind, gitOptions ?? {});
  return { ...repo, ...gitInfo, indexedAt: nowMs };
}

/**
 * Run a full index refresh: discover repositories, incrementally enrich only
 * those whose Git state changed since the last run, persist the result, and
 * return the new index.
 *
 * This is the single orchestration seam between the filesystem, git, and cache
 * layers. The UI never calls those layers directly — it calls this. See
 * docs/ARCHITECTURE.md ("Indexing flow").
 *
 * @param deps See {@link RefreshDeps}.
 */
export async function refreshIndex(deps: RefreshDeps): Promise<RepositoryIndex> {
  const now = deps.now ?? Date.now;
  const concurrency = deps.concurrency ?? DEFAULT_CONCURRENCY;
  const emit = deps.onProgress ?? (() => undefined);

  emit({ phase: "discovering", discovered: 0, enriched: 0 });

  const previous = await deps.store.load();
  const previousByPath = indexByPath(previous);

  const discovered = await discoverRepositories({
    ...deps.discovery,
    onDiscover: (_repo, total) => emit({ phase: "discovering", discovered: total, enriched: 0 }),
    ...(deps.signal ? { signal: deps.signal } : {}),
  });
  log.info(`discovered ${discovered.length} repositories`);

  const { reused, toEnrich } = planEnrichment(discovered, previousByPath);
  log.info(`reusing ${reused.length}, enriching ${toEnrich.length}`);

  const nowMs = now();
  let enrichedCount = 0;
  const enriched = await mapWithConcurrency(toEnrich, concurrency, async (repo) => {
    const record = await enrichOne(repo, nowMs, deps.gitOptions);
    enrichedCount++;
    emit({
      phase: "enriching",
      discovered: discovered.length,
      enriched: enrichedCount,
    });
    return record;
  });

  const index: RepositoryIndex = {
    version: INDEX_SCHEMA_VERSION,
    updatedAt: now(),
    records: [...reused, ...enriched],
  };

  const saved = await deps.store.save(index);
  if (!saved) {
    log.error("failed to persist refreshed index");
  }

  emit({
    phase: "done",
    discovered: discovered.length,
    enriched: enrichedCount,
    message: `${index.records.length} repositories indexed`,
  });

  return index;
}
