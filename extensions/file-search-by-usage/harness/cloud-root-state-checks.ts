import { DatabaseSync } from "node:sqlite";
import {
  CLOUD_ROOT_STATE_KEY,
  forgetCloudRootState,
  prepareCloudRootState,
  readCloudRootState,
} from "../src/lib/cloud-root-state";

type Check = (condition: boolean, label: string) => void;
type Options = Parameters<typeof prepareCloudRootState>[1];

const SOURCE = "/cloud/account";
const SECOND_SOURCE = "/cloud/second";
const OLD = "/mounted/old";
const NEXT = "/mounted/new";
const resolution = (source: string, root: string, resolved = true) => ({
  source,
  root,
  resolved,
});
const options = (
  resolutions: Options["resolutions"],
  override: Partial<Options> = {},
): Options => ({
  cloudRoot: "/cloud",
  canonicalCloudRoot: "/cloud",
  knownRoots: [],
  sources: [SOURCE],
  resolutions,
  authoritative: true,
  ...override,
});

function fixture(work: (db: DatabaseSync) => void): void {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE index_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  try {
    work(db);
  } finally {
    db.close();
  }
}

function failure(work: () => unknown): unknown {
  try {
    work();
    return undefined;
  } catch (error) {
    return error;
  }
}

function flatMarker(db: DatabaseSync, root: string): void {
  db.prepare("INSERT INTO index_meta (key, value) VALUES (?, ?)").run(
    `cloud-root:${root}`,
    root,
  );
}

function stored(db: DatabaseSync): string | undefined {
  return db
    .prepare("SELECT value FROM index_meta WHERE key = ?")
    .get(CLOUD_ROOT_STATE_KEY)?.value as string | undefined;
}

/** Storage-only checks use in-memory databases and synthetic absolute paths. */
export async function cloudRootStateChecks(assert: Check): Promise<void> {
  console.log("\n=== cloud root provenance ===");
  fixture((db) => {
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    const next = prepareCloudRootState(db, options([resolution(SOURCE, NEXT)]));
    assert(
      next.retiringRoots.join() === OLD &&
        next.protectedRoots.join() === NEXT &&
        readCloudRootState(db)?.sources[SOURCE].roots.join() ===
          [OLD, NEXT].join(),
      "retargeting persists both targets before scanning and separates old cleanup guards from traversal exclusions",
    );
    const pending = stored(db);
    db.exec("BEGIN");
    next.commitCleanup();
    db.exec("ROLLBACK");
    assert(
      stored(db) === pending,
      "rolling back final cleanup preserves pending target history",
    );
    const retry = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT)]),
    );
    assert(
      retry.retiringRoots.join() === OLD,
      "a restarted replacement scan still knows which old target to retire",
    );
    db.exec("BEGIN");
    retry.commitCleanup();
    db.exec("COMMIT");
    assert(
      readCloudRootState(db)?.sources[SOURCE].roots.join() === NEXT,
      "committed authoritative cleanup retires only the completed source's historical targets",
    );
  });

  fixture((db) => {
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    prepareCloudRootState(db, options([resolution(SOURCE, NEXT)]));
    for (const current of [
      options([resolution(SOURCE, SOURCE, false)]),
      options([], { sources: [] }),
      options([resolution(SOURCE, NEXT)], { authoritative: false }),
    ]) {
      const result = prepareCloudRootState(db, current);
      result.commitCleanup();
      assert(
        result.retiringRoots.length === 0 &&
          result.protectedRoots.includes(OLD) &&
          result.protectedRoots.includes(NEXT) &&
          result.protectedRoots.includes(SOURCE) &&
          readCloudRootState(db)?.sources[SOURCE].current === NEXT &&
          readCloudRootState(db)?.sources[SOURCE].roots.length === 3,
        "failed resolution, missing providers and nonauthoritative settings cannot prove replacement",
      );
    }
  });

  fixture((db) => {
    const first = prepareCloudRootState(
      db,
      options([resolution(SOURCE, SOURCE, false)]),
    );
    assert(
      first.protectedRoots.includes(SOURCE) &&
        first.retiringRoots.length === 0 &&
        readCloudRootState(db)?.sources[SOURCE].current === undefined &&
        readCloudRootState(db)?.sources[SOURCE].roots.join() === SOURCE,
      "a first failed realpath records its possible fallback batch owner without claiming a resolved current target",
    );
    // The visible fallback could still stat successfully and commit a batch
    // before the provider disappears; provenance must survive independently.
    const disappeared = prepareCloudRootState(
      db,
      options([], { sources: [], knownRoots: [SOURCE] }),
    );
    disappeared.commitCleanup();
    assert(
      disappeared.protectedRoots.includes(SOURCE) &&
        disappeared.retiringRoots.length === 0 &&
        readCloudRootState(db)?.sources[SOURCE].roots.join() === SOURCE,
      "a fallback-owned batch stays protected when its provider disappears after failed canonical resolution",
    );
  });

  fixture((db) => {
    prepareCloudRootState(
      db,
      options([resolution(SOURCE, OLD), resolution(SECOND_SOURCE, OLD)], {
        sources: [SOURCE, SECOND_SOURCE],
      }),
    );
    const shared = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT)]),
    );
    shared.commitCleanup();
    assert(
      shared.retiringRoots.length === 0 && shared.protectedRoots.includes(OLD),
      "an absent alias preserves a shared target when another alias retargets",
    );
    const both = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT), resolution(SECOND_SOURCE, NEXT)], {
        sources: [SOURCE, SECOND_SOURCE],
      }),
    );
    assert(
      both.retiringRoots.join() === OLD,
      "a shared historical target retires only after every owning source resolves elsewhere",
    );
  });

  fixture((db) => {
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    const explicit = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT), resolution(OLD, OLD)]),
    );
    assert(
      explicit.retiringRoots.length === 0 && explicit.cloudRoots.includes(OLD),
      "an explicit configured target retains ownership after its automatic source retargets",
    );
  });

  fixture((db) => {
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    const refused = prepareCloudRootState(
      db,
      options([], {
        sources: [],
        removedSources: [SOURCE],
        authoritative: false,
      }),
    );
    refused.commitCleanup();
    assert(
      refused.retiringRoots.length === 0 &&
        readCloudRootState(db)?.sources[SOURCE].roots.join() === OLD,
      "nonauthoritative discovery cannot retire a provider that appeared to become a file",
    );
    const removed = prepareCloudRootState(
      db,
      options([], { sources: [], removedSources: [SOURCE] }),
    );
    assert(
      removed.retiringRoots.join() === OLD &&
        removed.protectedRoots.length === 0 &&
        readCloudRootState(db)?.sources[SOURCE].roots.join() === OLD,
      "a proven non-directory provider keeps pending ownership until final cleanup",
    );
    const unavailableRetry = prepareCloudRootState(
      db,
      options([], { sources: [] }),
    );
    assert(
      unavailableRetry.retiringRoots.length === 0 &&
        unavailableRetry.protectedRoots.includes(OLD),
      "a failed non-directory cleanup followed by an absent provider retains the old target",
    );
    const committed = prepareCloudRootState(
      db,
      options([], { sources: [], removedSources: [SOURCE] }),
    );
    committed.commitCleanup();
    assert(
      readCloudRootState(db)?.sources[SOURCE] === undefined,
      "authoritative cleanup removes the proven non-directory source record",
    );
  });

  fixture((db) => {
    prepareCloudRootState(
      db,
      options([resolution(SOURCE, OLD), resolution(SECOND_SOURCE, OLD)], {
        sources: [SOURCE, SECOND_SOURCE],
      }),
    );
    const shared = prepareCloudRootState(
      db,
      options([], { sources: [], removedSources: [SOURCE] }),
    );
    shared.commitCleanup();
    assert(
      shared.retiringRoots.length === 0 &&
        shared.protectedRoots.includes(OLD) &&
        readCloudRootState(db)?.sources[SECOND_SOURCE].roots.join() === OLD,
      "a provider becoming a file cannot retire another alias's unavailable target",
    );
    const explicit = prepareCloudRootState(
      db,
      options([resolution(OLD, OLD)], {
        sources: [],
        removedSources: [SECOND_SOURCE],
      }),
    );
    assert(
      explicit.retiringRoots.length === 0,
      "a provider becoming a file cannot retire an explicitly configured target",
    );
  });

  fixture((db) => {
    flatMarker(db, SOURCE);
    prepareCloudRootState(
      db,
      options([resolution(SOURCE, SOURCE)], { knownRoots: [SOURCE] }),
    );
    const next = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT)], { knownRoots: [SOURCE] }),
    );
    assert(
      next.retiringRoots.join() === SOURCE,
      "legacy direct-provider ownership survives migration and a later retarget",
    );
    next.commitCleanup();
    const later = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT)], { knownRoots: [SOURCE] }),
    );
    assert(
      !later.cloudRoots.includes(SOURCE) &&
        db
          .prepare("SELECT 1 FROM index_meta WHERE key GLOB 'cloud-root:*'")
          .get() === undefined,
      "migration does not resurrect retired cloud ownership from surviving explicit-scope rows",
    );
  });

  fixture((db) => {
    flatMarker(db, OLD);
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    const replaced = prepareCloudRootState(
      db,
      options([resolution(SOURCE, NEXT)]),
    );
    replaced.commitCleanup();
    assert(
      replaced.retiringRoots.length === 0 &&
        replaced.protectedRoots.includes(OLD) &&
        readCloudRootState(db)?.legacyRoots.includes(OLD) === true,
      "an external legacy target keeps unknown historical ownership despite a matching observed source",
    );
    forgetCloudRootState(db);
    assert(
      db.prepare("SELECT 1 FROM index_meta").get() === undefined,
      "explicit cloud-off cleanup removes both source history and legacy markers",
    );
  });

  fixture((db) => {
    const original = "/physical-cloud/account";
    const later = "/physical-cloud/later-local-scope";
    prepareCloudRootState(
      db,
      options([], {
        canonicalCloudRoot: undefined,
        authoritative: false,
        knownRoots: [original, "/local"],
        sources: [],
      }),
    );
    assert(
      readCloudRootState(db)?.migrationRoots?.includes(original) === true,
      "first-run discovery failure preserves the original roots awaiting parent identity",
    );
    const migrated = prepareCloudRootState(
      db,
      options([], {
        canonicalCloudRoot: "/physical-cloud",
        knownRoots: [original, later, "/local"],
        sources: [],
      }),
    );
    migrated.commitCleanup();
    assert(
      migrated.protectedRoots.includes(original) &&
        !migrated.protectedRoots.includes(later) &&
        !migrated.protectedRoots.includes("/local") &&
        readCloudRootState(db)?.migrationRoots === undefined,
      "delayed canonical-parent migration uses only the initial root snapshot",
    );
  });

  fixture((db) => {
    for (const value of [
      "{broken",
      "{}",
      JSON.stringify({ version: 2, sources: {}, legacyRoots: [] }),
      JSON.stringify({
        version: 1,
        sources: { [SOURCE]: { current: OLD, roots: [NEXT] } },
        legacyRoots: [],
      }),
      JSON.stringify({
        version: 1,
        sources: {},
        legacyRoots: [],
        migrationRoots: "not a list",
      }),
    ]) {
      db.prepare("INSERT OR REPLACE INTO index_meta VALUES (?, ?)").run(
        CLOUD_ROOT_STATE_KEY,
        value,
      );
      const error = failure(() =>
        prepareCloudRootState(db, options([resolution(SOURCE, NEXT)])),
      );
      assert(
        error instanceof Error && stored(db) === value,
        "malformed provenance fails closed without replacing the saved state",
      );
    }
  });

  fixture((db) => {
    prepareCloudRootState(db, options([resolution(SOURCE, OLD)]));
    const before = stored(db);
    db.exec(`CREATE TRIGGER fail_provenance BEFORE INSERT ON index_meta
      WHEN NEW.key = '${CLOUD_ROOT_STATE_KEY}'
      BEGIN SELECT RAISE(ABORT, 'Synthetic provenance write failure'); END`);
    const error = failure(() =>
      prepareCloudRootState(db, options([resolution(SOURCE, NEXT)])),
    );
    assert(
      error instanceof Error && stored(db) === before,
      "failed pending provenance writes stop preparation without discarding old ownership",
    );
    db.exec("DROP TRIGGER fail_provenance");
    const next = prepareCloudRootState(db, options([resolution(SOURCE, NEXT)]));
    flatMarker(db, OLD);
    const pending = stored(db);
    db.exec(`CREATE TRIGGER fail_cleanup BEFORE INSERT ON index_meta
      WHEN NEW.key = '${CLOUD_ROOT_STATE_KEY}'
      BEGIN SELECT RAISE(ABORT, 'Synthetic cleanup write failure'); END`);
    db.exec("BEGIN");
    const cleanupError = failure(next.commitCleanup);
    db.exec("ROLLBACK");
    assert(
      cleanupError instanceof Error &&
        stored(db) === pending &&
        db
          .prepare("SELECT 1 FROM index_meta WHERE key = ?")
          .get(`cloud-root:${OLD}`) !== undefined,
      "failed final provenance writes preserve pending history and legacy markers on rollback",
    );
    db.exec("ALTER TABLE index_meta RENAME TO inaccessible_meta");
    assert(
      failure(() => readCloudRootState(db)) instanceof Error,
      "a provenance storage read failure cannot become an empty ownership map",
    );
  });
}
