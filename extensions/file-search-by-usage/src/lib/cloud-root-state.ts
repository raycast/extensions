import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

export const CLOUD_ROOT_STATE_KEY = "cloud-root-state:v1";

export type CloudRootState = {
  version: 1;
  sources: Record<string, { current?: string; roots: string[] }>;
  /** Old target-only records whose visible provider cannot be established. */
  legacyRoots: string[];
  /** Initial root snapshot awaiting successful CloudStorage-parent resolution. */
  migrationRoots?: string[];
};

type RootResolution = { source: string; root: string; resolved: boolean };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function absolute(value: unknown): value is string {
  return (
    typeof value === "string" &&
    path.isAbsolute(value) &&
    path.resolve(value) === value
  );
}

function rootList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(absolute) &&
    new Set(value).size === value.length
  );
}

function malformed(): never {
  throw new Error("Saved cloud-root provenance is malformed; cleanup stopped.");
}

/** A failed or malformed read must never turn saved ownership into absence. */
export function readCloudRootState(
  db: DatabaseSync,
): CloudRootState | undefined {
  const row = db
    .prepare("SELECT value FROM index_meta WHERE key = ?")
    .get(CLOUD_ROOT_STATE_KEY);
  if (row === undefined) return undefined;
  if (typeof row.value !== "string") return malformed();
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    return malformed();
  }
  if (
    !record(parsed) ||
    parsed.version !== 1 ||
    !record(parsed.sources) ||
    !rootList(parsed.legacyRoots) ||
    (Object.hasOwn(parsed, "migrationRoots") &&
      !rootList(parsed.migrationRoots)) ||
    Object.keys(parsed).some(
      (key) =>
        !["version", "sources", "legacyRoots", "migrationRoots"].includes(key),
    )
  )
    return malformed();
  for (const [source, entry] of Object.entries(parsed.sources)) {
    if (
      !absolute(source) ||
      !record(entry) ||
      !rootList(entry.roots) ||
      entry.roots.length === 0 ||
      Object.keys(entry).some((key) => key !== "current" && key !== "roots") ||
      (Object.hasOwn(entry, "current") &&
        (!absolute(entry.current) || !entry.roots.includes(entry.current)))
    )
      return malformed();
  }
  return parsed as CloudRootState;
}

function save(db: DatabaseSync, state: CloudRootState): void {
  db.prepare(
    "INSERT OR REPLACE INTO index_meta (key, value) VALUES (?, ?)",
  ).run(CLOUD_ROOT_STATE_KEY, JSON.stringify(state));
}

/** Caller holds the indexing lock and, for cleanup, its final transaction. */
export function forgetCloudRootState(db: DatabaseSync): void {
  db.prepare(
    "DELETE FROM index_meta WHERE key = ? OR key GLOB 'cloud-root:*'",
  ).run(CLOUD_ROOT_STATE_KEY);
}

/**
 * Save the union of old and newly observed ownership before scanning starts.
 * Only commitCleanup may trim that union, after authoritative completion.
 */
export function prepareCloudRootState(
  db: DatabaseSync,
  options: {
    cloudRoot: string;
    canonicalCloudRoot?: string;
    knownRoots: readonly string[];
    sources: readonly string[];
    /** Existing provider entries proven to be non-directories by a successful stat. */
    removedSources?: readonly string[];
    resolutions: readonly RootResolution[];
    authoritative: boolean;
  },
): {
  protectedRoots: string[];
  retiringRoots: string[];
  cloudRoots: string[];
  commitCleanup: () => void;
} {
  const saved = readCloudRootState(db);
  const state = saved ?? {
    version: 1,
    sources: {},
    legacyRoots: [],
  };
  const cloudRoot = path.resolve(options.cloudRoot);
  const cloudParents = new Set([
    cloudRoot,
    ...(options.canonicalCloudRoot === undefined
      ? []
      : [path.resolve(options.canonicalCloudRoot)]),
  ]);
  const sources = new Set(
    options.sources.map((source) => path.resolve(source)),
  );
  const observed = new Map<string, string>();
  for (const resolution of options.resolutions) {
    const source = path.resolve(resolution.source);
    if (sources.has(source) && resolution.resolved)
      observed.set(source, path.resolve(resolution.root));
  }
  const removed = new Set(
    (options.removedSources ?? [])
      .map((source) => path.resolve(source))
      .filter((source) => !observed.has(source)),
  );
  const add = (source: string, root: string) => {
    const entry = state.sources[source] ?? { roots: [] };
    if (!entry.roots.includes(root)) entry.roots.push(root);
    state.sources[source] = entry;
  };

  const legacy = new Set(state.legacyRoots);
  if (saved === undefined) {
    const flat = db
      .prepare(
        "SELECT key, value FROM index_meta WHERE key GLOB 'cloud-root:*'",
      )
      .all();
    for (const row of flat) {
      if (!absolute(row.value) || row.key !== `cloud-root:${row.value}`)
        malformed();
      legacy.add(row.value as string);
    }
    // Earlier releases wrote batches before root bookkeeping. Import once:
    // otherwise retired cloud targets retained as explicit scopes resurrect.
    for (const root of options.knownRoots) {
      const normalized = path.resolve(root);
      if (cloudParents.has(path.dirname(normalized))) legacy.add(normalized);
    }
    if (options.canonicalCloudRoot === undefined)
      state.migrationRoots = [
        ...new Set(
          options.knownRoots
            .map((root) => path.resolve(root))
            .filter((root) => !cloudParents.has(path.dirname(root))),
        ),
      ];
  }
  if (options.canonicalCloudRoot !== undefined && state.migrationRoots) {
    // Use only the initial snapshot: scopes added or retired later must not be
    // reclassified as automatic providers by a delayed migration.
    for (const root of state.migrationRoots)
      if (cloudParents.has(path.dirname(root))) legacy.add(root);
    delete state.migrationRoots;
  }
  for (const root of legacy) {
    if (cloudParents.has(path.dirname(root))) {
      add(path.join(cloudRoot, path.basename(root)), root);
      legacy.delete(root);
    }
    // An external target may also belong to a historical, currently absent
    // provider. Observing one matching source cannot establish sole ownership.
  }
  state.legacyRoots = [...legacy];
  // Even a failed realpath may leave a usable visible scope. If its scan
  // commits batches, remember that fallback owner before any rows are written.
  for (const resolution of options.resolutions) {
    const source = path.resolve(resolution.source);
    if (sources.has(source)) add(source, path.resolve(resolution.root));
  }
  for (const [source, root] of observed) {
    state.sources[source].current = root;
  }

  const all = new Set(state.legacyRoots);
  const retained = new Set(state.legacyRoots);
  for (const [source, entry] of Object.entries(state.sources)) {
    for (const root of entry.roots) all.add(root);
    const current = observed.get(source);
    const keep = !options.authoritative
      ? entry.roots
      : removed.has(source)
        ? []
        : current === undefined
          ? entry.roots
          : [current];
    for (const root of keep) retained.add(root);
  }
  // Even an unavailable explicitly configured root retains its exact identity.
  const configured = new Set(
    options.resolutions.map((resolution) => path.resolve(resolution.root)),
  );
  const retiringRoots = options.authoritative
    ? [...all].filter((root) => !retained.has(root) && !configured.has(root))
    : [];

  // One atomic record ensures interrupted batches always retain their origins.
  save(db, state);
  return {
    protectedRoots: [...retained],
    retiringRoots,
    cloudRoots: [...all],
    commitCleanup: () => {
      if (!options.authoritative) return;
      const cleaned: CloudRootState = {
        version: 1,
        sources: Object.fromEntries(
          Object.entries(state.sources).flatMap(([source, entry]) => {
            if (removed.has(source)) return [];
            const current = observed.get(source);
            return [
              [
                source,
                current === undefined ? entry : { current, roots: [current] },
              ],
            ];
          }),
        ),
        legacyRoots: state.legacyRoots,
        ...(state.migrationRoots === undefined
          ? {}
          : { migrationRoots: state.migrationRoots }),
      };
      // The caller commits this together with stale-row and owner cleanup.
      save(db, cleaned);
      db.exec("DELETE FROM index_meta WHERE key GLOB 'cloud-root:*'");
    },
  };
}
