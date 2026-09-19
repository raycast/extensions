import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRecentValidator } from "../src/lib/recent-validation";
import { createReadPool } from "../src/lib/bounded-reads";
import { getEventListeners } from "node:events";
import {
  cloudPathCandidates,
  standardPathCandidates,
} from "../src/lib/starting-paths";
import { Entry } from "../src/lib/types";

/**
 * Validating cached candidates before they are ranked.
 *
 * Every memory source hands the browser paths it saw earlier, so the metadata
 * has to be refreshed before a size or date filter can be trusted, and the
 * reads have to be bounded and cancellable. `createRecentValidator` does that
 * for all of them despite its name.
 */
export async function cachedEntryChecks(
  assert: (ok: boolean, label: string) => void,
) {
  console.log("\n=== cached candidates ===");
  const originalReaddir = fsp.readdir;
  let cloudReads = 0;
  let releaseCloud: (names: string[]) => void = () => {};
  fsp.readdir = (() => {
    cloudReads++;
    return new Promise<string[]>((resolve) => {
      releaseCloud = resolve;
    });
  }) as typeof fsp.readdir;
  try {
    const signal = new AbortController().signal;
    const first = await cloudPathCandidates(signal, "/synthetic/foo", 10);
    const retry = await cloudPathCandidates(signal, "/synthetic/foo", 10);
    assert(
      first.partial && retry.partial && cloudReads === 1,
      "cloud-location discovery has a deadline and shares stalled reads across retries",
    );
    releaseCloud(["bar", ".baz"]);
    await new Promise((resolve) => setImmediate(resolve));
    fsp.readdir = (async () => ["bar", ".baz"]) as typeof fsp.readdir;
    const recovered = await cloudPathCandidates(signal, "/synthetic/foo");
    assert(
      !recovered.partial &&
        recovered.paths.length === 1 &&
        recovered.paths[0].path.endsWith("/bar"),
      "cloud-location discovery recovers and excludes hidden mounts",
    );
    assert(
      standardPathCandidates("/synthetic/foo").length === 5,
      "standard-location candidates need no filesystem reads",
    );
  } finally {
    fsp.readdir = originalReaddir;
  }
  const pool = createReadPool(1);
  const immediate = new AbortController();
  let started = 0;
  const stopped = pool(
    "foo",
    async () => {
      started++;
    },
    immediate.signal,
  ).catch(() => {});
  immediate.abort();
  await stopped;
  assert(
    started === 0,
    "cancelling before a queued read starts prevents physical work",
  );
  assert(
    getEventListeners(immediate.signal, "abort").length === 0,
    "cancelled read subscribers detach from their signal",
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cached-entries-"));
  try {
    const document = path.join(root, "foo.txt");
    fs.writeFileSync(document, "foo");
    const candidate: Entry = {
      path: document,
      name: "foo.txt",
      isDirectory: false,
      isSymlink: false,
      size: 2048,
      mtimeMs: Date.now(),
      birthtimeMs: Date.now(),
    };
    const stale: Entry = { ...candidate, size: 1, mtimeMs: 1 };

    // A filter must be applied to refreshed metadata, not to what was cached.
    const refreshed = await createRecentValidator(async () => candidate)(
      [stale],
      { query: "foo size:>1kb" },
    );
    assert(
      refreshed.entries.length === 1 && refreshed.entries[0].size === 2048,
      "a filter uses refreshed metadata rather than stale cached values",
    );
    const shrunk = await createRecentValidator(async () => stale)([candidate], {
      query: "foo size:>1kb",
    });
    assert(
      shrunk.entries.length === 0 && !shrunk.partial,
      "fresh metadata also removes cached files that no longer meet a filter",
    );

    let pathReads = 0;
    const manyPaths = Array.from({ length: 1000 }, (_, i) => ({
      path: `${document}-${i}`,
    }));
    const boundedPaths = createRecentValidator(async (full) => {
      pathReads++;
      return { ...candidate, path: full };
    });
    const pathResult = await boundedPaths(manyPaths);
    assert(
      pathResult.entries.length === 60 && pathReads <= 67,
      "path-only validation stops after a usable shortlist and its in-flight batch",
    );
    const allStarting = await boundedPaths(manyPaths.slice(0, 61), {
      limit: Infinity,
    });
    assert(
      allStarting.entries.length === 61,
      "starting locations can retain all candidates before the browser applies its query",
    );

    const missingPrefix = Array.from({ length: 60 }, (_, i) => ({
      ...candidate,
      path: path.join(root, `missing-${i}.txt`),
    }));
    const beyondMissing = await createRecentValidator(async (full) =>
      full === document ? candidate : undefined,
    )([...missingPrefix, candidate]);
    assert(
      beyondMissing.entries.some((entry) => entry.path === document),
      "missing candidates do not hide a live result after the first sixty",
    );

    const errorLstat = fsp.lstat;
    try {
      for (const code of ["EACCES", "EIO", "ENOENT"]) {
        fsp.lstat = (async () => {
          throw Object.assign(new Error("Synthetic metadata error"), { code });
        }) as typeof fsp.lstat;
        const checkedError = await createRecentValidator()([candidate]);
        assert(
          code === "ENOENT"
            ? checkedError.entries.length === 0 && !checkedError.partial
            : checkedError.entries.length === 1 && checkedError.partial,
          `${code} is distinguished from a confirmed missing cached file`,
        );
      }
    } finally {
      fsp.lstat = errorLstat;
    }

    let active = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    const validator = createRecentValidator(async (full) => {
      if (full === document) return candidate;
      active++;
      peak = Math.max(peak, active);
      return new Promise((resolve) =>
        releases.push(() => {
          active--;
          resolve(undefined);
        }),
      );
    });
    const slow = Array.from({ length: 12 }, (_, i) => ({
      ...candidate,
      path: path.join(root, `slow-${i}`),
    }));
    const firstRead = validator([candidate, ...slow], { budgetMs: 20 });
    const secondRead = validator(
      slow.map((e) => ({ ...e, path: e.path + "-next" })),
      { budgetMs: 20 },
    );
    const [firstResult, secondResult] = await Promise.all([
      firstRead,
      secondRead,
    ]);
    assert(
      firstResult.partial && secondResult.partial,
      "stalled validation settles as partial at its deadline",
    );
    assert(
      firstResult.entries.some((e) => e.path === document),
      "the readable row is in the result a stalled batch settles with",
    );
    assert(
      peak > 0 && peak <= 8,
      "overlapping queries share a limit of eight metadata reads",
    );
    const fallback = await validator([candidate], { budgetMs: 10 });
    assert(
      fallback.partial &&
        fallback.entries.some((e) => e.path === candidate.path),
      "a saturated metadata pool returns cached rows with partial status",
    );
    releases.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
    assert(
      active === 0,
      "releasing the stalled reads after the deadline leaves nothing running",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
