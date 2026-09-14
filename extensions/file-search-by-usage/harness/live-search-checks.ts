import { readUsageMetaResult } from "../src/lib/spotlight";
import { createRecentValidator } from "../src/lib/recent-validation";
import { Entry } from "../src/lib/types";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DirectorySnapshot,
  observeDirectory,
  readDirectoryAsync,
} from "../src/lib/directory-listing";
import { createWorkQueue } from "../src/lib/work-queue";
import { readBoundedDirectory } from "../src/lib/bounded-directory";

const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * The reads that still run during a search: the bounded work
 * queue, folder listing, cached-path validation, and usage metadata. The index
 * answers name queries now, so nothing here spawns a search process.
 */
export async function liveSearchChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const queuedController = new AbortController();
  let releaseWork = () => {};
  const stalledWork = new Promise<void>((resolve) => {
    releaseWork = resolve;
  });
  const started: number[] = [];
  const queue = createWorkQueue<number>(
    async ([item]) => {
      started.push(item);
      await stalledWork;
    },
    queuedController.signal,
    { concurrency: 1, maxPending: 2 },
  );
  let producerFinished = false;
  const producer = queue.push([1, 2, 3, 4, 5]).then(() => {
    producerFinished = true;
  });
  await turn();
  assert(
    started.length === 1 && !producerFinished,
    "a full live queue applies backpressure to the source",
  );
  queuedController.abort();
  await producer;
  await queue.drain();
  releaseWork();
  await turn();
  assert(
    producerFinished && started.length === 1,
    "cancellation releases blocked producers without starting queued work",
  );

  const candidates = Array.from({ length: 125 }, (_, i) => ({
    path: `/foo/bar${i}`,
  }));
  const validate = createRecentValidator(async (full): Promise<Entry> => ({
    path: full,
    name: full.split("/").at(-1)!,
    isDirectory: false,
    isSymlink: false,
    size: 1,
    mtimeMs: 1,
    birthtimeMs: 1,
  }));
  const checked = await validate(candidates, {
    query: "bar",
    limit: Infinity,
  });
  assert(
    checked.entries.length === 125,
    "a source that asks for every match gets more than the default sixty",
  );
  /*
   * A stalled batch among several running at once.
   *
   * Batches run concurrently, so one that hits the deadline stops the pass
   * without discarding what its neighbours already returned. The result is
   * partial rather than failed, and the ranking falls back to modification
   * time for the paths it did not reach.
   */
  let metadataCalls = 0;
  const usagePaths = Array.from(
    { length: 400 },
    (_, index) => `/foo/usage${index}`,
  );
  const metadata = await readUsageMetaResult(
    usagePaths,
    { timeoutMs: 5000 },
    async (args) => {
      // Everything before the paths: -raw, -nullMarker NULL, and two -name pairs.
      const batch = args.length - 7;
      if (metadataCalls++ === 0) throw { code: "ETIMEDOUT" };
      return "NULL\x002\x00".repeat(batch);
    },
  );
  assert(
    metadataCalls > 1 && metadata.meta.size > 0,
    `batches that finished alongside a stalled one keep their metadata (${metadata.meta.size} paths from ${metadataCalls} batches)`,
  );
  assert(
    !metadata.complete &&
      metadata.partial !== undefined &&
      metadata.error === undefined,
    "and the pass reports partial coverage rather than a failure",
  );
  assert(
    metadata.meta.size < usagePaths.length,
    "while the stalled batch's own paths are left without usage metadata",
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "live-search-"));
  try {
    for (let i = 0; i < 3005; i++)
      fs.writeFileSync(path.join(root, `foo${i}.txt`), "foo");
    const listing = await readDirectoryAsync(root, false);
    assert(
      listing.entries.length === 3000 && listing.truncated > 0,
      "a folder listing retains a bounded number of entries and reports omissions",
    );
    /*
     * One publication of rows per read.
     *
     * The folder listing used to publish every 100ms, so the list grew and
     * reordered while the user was reading it. A subscriber should see the
     * pending marker and then the finished set, never a partial row list
     * followed by a larger one.
     */
    const seen: DirectorySnapshot[] = [];
    const stopObserving = observeDirectory(root, false, (snapshot) =>
      seen.push(snapshot),
    );
    try {
      const settled = async () => {
        for (let i = 0; i < 400; i++) {
          if (seen.some((s) => !s.pending && s.entries.length > 0)) return true;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        return false;
      };
      assert(await settled(), "the folder listing settles");
      const rowCounts = seen
        .map((snapshot) => snapshot.entries.length)
        .filter((count) => count > 0);
      assert(
        new Set(rowCounts).size === 1,
        `rows are published at one size, not in growing batches (${[...new Set(rowCounts)].join(", ")})`,
      );
      assert(
        seen.filter(
          (snapshot) => snapshot.entries.length > 0 && !snapshot.pending,
        ).length === 1,
        "exactly one finished listing is published for one read",
      );
    } finally {
      stopObserving();
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  /*
   * One entry never returns. The listing publishes once, so the question is
   * no longer whether later entries appear first; it is whether the listing
   * settles at all. Its deadline is what guarantees that, and the entries
   * it did not reach are reported as omitted.
   *
   * The folder holds fewer than MAX_ENTRIES names, so the reader stats every
   * one of them and the blocked path is reached whatever order the two
   * directory reads return. A folder larger than the cap would leave the
   * blocked name among the ones the reader never touches.
   */
  const stallRoot = fs.mkdtempSync(path.join(os.tmpdir(), "live-stall-"));
  try {
    const stallCount = 200;
    for (let i = 0; i < stallCount; i++)
      fs.writeFileSync(path.join(stallRoot, `foo${i}.txt`), "foo");
    const names = await fsp.readdir(stallRoot);
    const originalStat = fsp.stat;
    let releaseStat = () => {};
    const blocked = new Promise<void>((resolve) => {
      releaseStat = resolve;
    });
    try {
      fsp.stat = (async (full, ...args: unknown[]) => {
        if (String(full) === path.join(stallRoot, names[0])) await blocked;
        return Reflect.apply(originalStat, fsp, [full, ...args]);
      }) as typeof fsp.stat;

      const started = Date.now();
      const stalled = await readDirectoryAsync(stallRoot, false, undefined, {
        budgetMs: 300,
      });
      const elapsed = Date.now() - started;

      assert(
        elapsed < 3000,
        `a stalled entry cannot hold the listing open past its deadline (${elapsed}ms)`,
      );
      assert(
        stalled.entries.length > 0 &&
          stalled.entries.length < stallCount &&
          stalled.truncated > 0,
        `the listing returns what it read and reports the rest as omitted (${stalled.entries.length} of ${stallCount})`,
      );
      assert(
        !stalled.entries.some((entry) => entry.name === names[0]),
        "the entry that never returned is not in the result",
      );
    } finally {
      releaseStat();
      fsp.stat = originalStat;
    }
  } finally {
    fs.rmSync(stallRoot, { recursive: true, force: true });
  }

  /*
   * The bound on one directory read.
   *
   * readBoundedDirectory stops after one entry past the limit, and it skips
   * hidden names before it consults the limit. Both edges are invisible to a
   * caller that filters and slices again afterwards, which the folder listing
   * no longer does, so pin them here: a folder holding exactly the limit is
   * complete, and dotfiles cannot take a visible row's place.
   */
  const boundedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bounded-dir-"));
  try {
    const boundedCases = [
      {
        add: ["one.txt", "two.txt", "three.txt"],
        limit: 3,
        entries: 3,
        label: "a folder holding exactly the limit reports no omissions",
      },
      {
        add: [".one", ".two", ".three", ".four", ".five"],
        limit: 3,
        entries: 3,
        label:
          "hidden names are skipped before the limit, so they cannot fill it",
      },
    ];
    let bounded: Awaited<ReturnType<typeof readBoundedDirectory>> = {
      entries: [],
      truncated: false,
    };
    for (const boundedCase of boundedCases) {
      for (const name of boundedCase.add)
        fs.writeFileSync(path.join(boundedRoot, name), "foo");

      bounded = await readBoundedDirectory(
        boundedRoot,
        boundedCase.limit,
        false,
      );

      assert(
        bounded.entries.length === boundedCase.entries &&
          bounded.truncated === false,
        `${boundedCase.label} (${bounded.entries.length} entries, truncated ${bounded.truncated})`,
      );
    }
    assert(
      !bounded.entries.some((entry) => entry.name.startsWith(".")),
      "and no hidden name is returned as a row",
    );
  } finally {
    fs.rmSync(boundedRoot, { recursive: true, force: true });
  }
}
