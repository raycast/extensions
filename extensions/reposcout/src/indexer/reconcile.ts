import type { DiscoveredRepository, RepositoryRecord } from "../types/repository";

/**
 * Pure incremental-indexing logic. Given freshly discovered repositories and the
 * previously cached records, decide which repositories can reuse their cached
 * Git metadata and which must be re-enriched. Keeping this pure makes the
 * incremental behavior exhaustively testable without any git or filesystem I/O.
 */

/** The outcome of reconciling discovered repos against the previous index. */
export interface EnrichmentPlan {
  /** Records reused verbatim from the previous index (fingerprint unchanged). */
  readonly reused: RepositoryRecord[];
  /** Discovered repositories whose Git metadata must be recomputed. */
  readonly toEnrich: DiscoveredRepository[];
}

/**
 * A discovered repo can reuse cached metadata when a previous record exists at
 * the same path, both fingerprints are known, and they are equal. A `null`
 * fingerprint on either side forces re-enrichment (we cannot prove freshness).
 */
function canReuse(
  discovered: DiscoveredRepository,
  previous: RepositoryRecord | undefined,
): previous is RepositoryRecord {
  return (
    previous !== undefined &&
    previous.kind === discovered.kind &&
    previous.fingerprint !== null &&
    discovered.fingerprint !== null &&
    previous.fingerprint === discovered.fingerprint
  );
}

/**
 * Build an {@link EnrichmentPlan} from discovered repos and the previous index.
 *
 * @param discovered   Repositories found by the current scan.
 * @param previousByPath Map of the previous index's records keyed by path.
 */
export function planEnrichment(
  discovered: readonly DiscoveredRepository[],
  previousByPath: ReadonlyMap<string, RepositoryRecord>,
): EnrichmentPlan {
  const reused: RepositoryRecord[] = [];
  const toEnrich: DiscoveredRepository[] = [];

  for (const repo of discovered) {
    const previous = previousByPath.get(repo.path);
    if (canReuse(repo, previous)) {
      // Keep cached Git metadata but adopt the latest filesystem identity
      // (name/fingerprint are already equal; this is defensive and cheap).
      reused.push({ ...previous, name: repo.name });
    } else {
      toEnrich.push(repo);
    }
  }

  return { reused, toEnrich };
}
