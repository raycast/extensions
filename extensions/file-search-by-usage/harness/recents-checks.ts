import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  findRecentPaths,
  scanRecentFiles,
  selectRecentEntries,
} from "../src/lib/recent-files";
import { createRecentValidator } from "../src/lib/recent-validation";
import { createReadPool } from "../src/lib/bounded-reads";
import { scanShortcuts } from "../src/lib/drive-shortcuts";
import { scanSharedFolders } from "../src/lib/shared-scan";
import { getEventListeners } from "node:events";
import {
  cloudPathCandidates,
  standardPathCandidates,
} from "../src/lib/starting-paths";

export async function recentsChecks(
  assert: (ok: boolean, label: string) => void,
) {
  console.log("\n=== recent-file setup ===");
  for (const scan of [scanShortcuts, scanSharedFolders]) {
    const original = fsp.readdir;
    let reads = 0;
    const releases: (() => void)[] = [];
    fsp.readdir = (() => {
      reads++;
      return new Promise((resolve) => releases.push(() => resolve([])));
    }) as typeof fsp.readdir;
    try {
      const controller = new AbortController();
      const pending = scan({
        cloudRoot: "/synthetic/drive-setup",
        signal: controller.signal,
      });
      await new Promise((resolve) => setImmediate(resolve));
      controller.abort();
      const result = await Promise.race([
        pending,
        new Promise<undefined>((resolve) => setTimeout(resolve, 30)),
      ]);
      assert(
        result !== undefined && result.partial,
        "stopping Drive setup returns promptly even when a provider read stalls",
      );
      const retry = await Promise.race([
        scan({ cloudRoot: "/synthetic/drive-setup", budgetMs: 10 }),
        new Promise<undefined>((resolve) => setTimeout(resolve, 30)),
      ]);
      assert(
        retry?.partial === true &&
          retry.partialReason === "time-limit" &&
          reads === 1,
        "Drive scan retries share stalled physical reads and report the deadline accurately",
      );
    } finally {
      for (const release of releases) release();
      await new Promise((resolve) => setImmediate(resolve));
      fsp.readdir = original;
    }
  }
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
  let queryArgs: string[] = [];
  let executable = "";
  const querySignal = new AbortController().signal;
  const queryResult = await findRecentPaths(
    "/Users/foo bar",
    querySignal,
    async (file, args, options) => {
      executable = file;
      queryArgs = args;
      assert(
        options.signal === querySignal,
        "the recent-file Spotlight process receives cancellation",
      );
      return {
        stdout:
          Array.from(
            { length: 501 },
            (_, i) => `/Users/foo bar/baz-${i}\n.txt`,
          ).join("\0") + "\0",
      };
    },
  );
  assert(
    executable === "/usr/bin/mdfind" &&
      queryArgs[0] === "-0" &&
      queryArgs[1] === "-onlyin" &&
      queryArgs[2] === "/Users/foo bar",
    "recent-file search passes the home scope as an argument without a shell",
  );
  assert(
    queryArgs[3].includes("kMDItemLastUsedDate >= $time.now(-604800)") &&
      queryArgs[3].includes("kMDItemLastUsedDate <= $time.now"),
    "recent-file search queries exactly the preceding seven days of last-use metadata",
  );
  assert(
    queryResult.truncated &&
      queryResult.paths.length === 500 &&
      queryResult.paths[0].endsWith("\n.txt"),
    "recent queries cap candidate paths and preserve filenames containing newlines",
  );
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "search-recents-"));
  try {
    fs.mkdirSync(path.join(root, "foo", "bar"), { recursive: true });
    for (const name of ["foo.txt", "baz.md", ".secret"])
      fs.writeFileSync(path.join(root, "foo", name), "fixture");
    fs.writeFileSync(path.join(root, "foo", "bar", "deep.txt"), "fixture");
    const document = path.join(root, "foo", "foo.txt");
    let metadataTimeout = 0;
    const importMessages: string[] = [];
    await scanRecentFiles(
      {
        home: root,
        budgetMs: 60_000,
        metadataBudgetMs: 15_000,
        onStatus: (message) => importMessages.push(message),
      },
      {
        find: async () => ({ paths: [document], truncated: false }),
        usage: async (_paths, options) => {
          metadataTimeout = options.timeoutMs;
          return { meta: new Map(), complete: true };
        },
      },
    );
    assert(
      metadataTimeout === 15_000 &&
        importMessages.some((message) => /metadata/.test(message)) &&
        importMessages.some((message) => /parent folder/.test(message)),
      "recent setup uses the longer metadata budget and reports the real scan phases",
    );
    const result = await scanRecentFiles(
      { home: root },
      {
        find: async () => ({
          paths: [document, document, "/outside/bar.txt"],
          truncated: false,
        }),
        usage: async () => ({
          meta: new Map([[document, { lastUsedMs: Date.now() - 1000 }]]),
          complete: true,
        }),
      },
    );
    assert(
      result.entries.some((e) => e.path === document && e.recent),
      "recent documents seed the initial list",
    );
    assert(
      result.entries.some((e) => e.path === path.join(root, "foo")),
      "recent documents contribute their parent folder",
    );
    assert(
      result.entries.some(
        (e) => e.path === path.join(root, "foo", "baz.md") && !e.recent,
      ),
      "parent scans cache neighboring files without marking them recently opened",
    );
    assert(
      !result.entries.some(
        (e) =>
          e.path.endsWith("deep.txt") ||
          e.path.endsWith(".secret") ||
          e.path.startsWith("/outside"),
      ),
      "recent import stays shallow and excludes hidden and out-of-scope files",
    );
    assert(
      new Set(result.entries.map((e) => e.path)).size === result.entries.length,
      "duplicate recent paths and parent scans do not duplicate results",
    );
    const initial = selectRecentEntries(result.entries, "", undefined, false);
    assert(
      initial.length === 1 && initial[0].path === document,
      "an empty query shows recent documents rather than unrelated siblings",
    );
    assert(
      selectRecentEntries(
        result.entries,
        "foo -f",
        path.dirname(document),
        false,
      ).some((e) => e.path === document),
      "recent files remain searchable from their direct parent folder",
    );
    assert(
      selectRecentEntries(result.entries, "foo -f", "/", false).length === 0,
      "root-folder queries do not admit cached recent files from deeper directories",
    );
    fs.mkdirSync(path.join(root, "outside"));
    fs.writeFileSync(path.join(root, "outside", "bar.txt"), "fixture");
    fs.symlinkSync(path.join(root, "outside"), path.join(root, "foo", "alias"));
    const aliasScan = await scanRecentFiles(
      { home: path.join(root, "foo") },
      {
        find: async () => ({
          paths: [path.join(root, "foo", "alias", "bar.txt")],
          truncated: false,
        }),
        usage: async () => ({ meta: new Map(), complete: true }),
      },
    );
    assert(
      aliasScan.entries.length === 0,
      "an aliased parent cannot import files from outside the selected home folder",
    );
    assert(
      selectRecentEntries(result.entries, "baz ext:md -f", undefined, false)
        .length === 1,
      "imported neighbors participate in normal filtered memory searches",
    );
    assert(
      result.entries.every((e) => e.useCount === undefined),
      "importing recent paths does not fabricate usage counts",
    );
    const bounded = await scanRecentFiles(
      { home: root, maxPerFolder: 1 },
      {
        find: async () => ({ paths: [document], truncated: false }),
        usage: async () => ({ meta: new Map(), complete: true }),
      },
    );
    assert(
      bounded.partial && bounded.entries.some((e) => e.path === document),
      "a folder item limit retains recent files and reports partial import",
    );
    assert(
      bounded.reasons?.includes("reached the 1-items-per-folder limit") ===
        true,
      "recent scan identifies the per-folder limit instead of blaming a timeout",
    );
    const controller = new AbortController();
    controller.abort();
    let queried = false;
    const cancelled = await scanRecentFiles(
      { home: root, signal: controller.signal },
      {
        find: async () => {
          queried = true;
          return { paths: [], truncated: false };
        },
      },
    );
    assert(
      cancelled.cancelled && !queried,
      "a cancelled recent import never queries Spotlight",
    );
    const timeout = await scanRecentFiles(
      { home: root, budgetMs: 5 },
      {
        find: async () => new Promise(() => {}),
      },
    );
    assert(
      timeout.partial && timeout.entries.length === 0,
      "a stalled recent query reaches its deadline without claiming completion",
    );
    assert(
      timeout.reasons?.includes(
        "the recent-file scan reached its time limit",
      ) === true,
      "recent scan records a deadline separately from item and metadata limits",
    );
    const failed = await scanRecentFiles(
      { home: root },
      {
        find: async () => {
          throw new Error("Synthetic Spotlight failure");
        },
      },
    );
    assert(
      Boolean(failed.error),
      "a failed recent query is distinguishable from no recent documents",
    );
    const direct = await scanRecentFiles(
      { home: path.join(root, "foo") },
      {
        find: async () => ({ paths: [document], truncated: false }),
        usage: async () => ({ meta: new Map(), complete: true }),
      },
    );
    assert(
      direct.entries.some((e) => e.path.endsWith("baz.md")),
      "documents directly in home also contribute immediate neighbors",
    );

    const candidate = result.entries.find((e) => e.path === document)!;
    const stale = { ...candidate, size: 1, mtimeMs: 1 };
    assert(
      selectRecentEntries([stale], "foo size:>1kb", undefined, false).length ===
        1,
      "mutable cached metadata does not exclude candidates before validation",
    );
    const fresh = { ...candidate, size: 2048, mtimeMs: Date.now() };
    const refresh = createRecentValidator(async () => fresh);
    for (const query of ["foo size:>1kb", "foo after:2020"]) {
      const current = await refresh(
        selectRecentEntries([stale], query, undefined, false),
        { query },
      );
      assert(
        current.entries.length === 1 && current.entries[0].size === 2048,
        `${query} uses refreshed metadata rather than stale imported values`,
      );
    }
    const shrunk = await createRecentValidator(async () => stale)([fresh], {
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
      path: path.join(root, `foo-${i}.txt`),
    }));
    const beyondMissing = await createRecentValidator(async (full) =>
      full === document ? candidate : undefined,
    )(
      selectRecentEntries(
        [...missingPrefix, candidate],
        "foo",
        undefined,
        false,
      ),
    );
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
    const originalRealpath = fsp.realpath;
    const originalLstat = fsp.lstat;
    const pendingPaths: (() => void)[] = [];
    let lateStats = 0;
    const stalledPrefix = path.join(root, "stalled-");
    const realRoot = await originalRealpath(root);
    fsp.realpath = ((full: string) =>
      full.startsWith(stalledPrefix)
        ? new Promise<string>((resolve) =>
            pendingPaths.push(() =>
              resolve(path.join(realRoot, path.relative(root, full))),
            ),
          )
        : originalRealpath(full)) as typeof fsp.realpath;
    fsp.lstat = ((full: string) => {
      if (full.startsWith(stalledPrefix)) lateStats++;
      return originalLstat(full);
    }) as typeof fsp.lstat;
    try {
      for (let run = 0; run < 2; run++) {
        const stalledImport = await scanRecentFiles(
          { home: root, budgetMs: 20 },
          {
            find: async () => ({
              paths: Array.from(
                { length: 8 },
                (_, i) => `${stalledPrefix}${run}-${i}.txt`,
              ),
              truncated: false,
            }),
            usage: async () => ({ meta: new Map(), complete: true }),
          },
        );
        assert(
          stalledImport.partial,
          "a stalled import reports partial progress",
        );
      }
      assert(
        pendingPaths.length <= 8,
        "import retries share the physical filesystem read limit",
      );
      pendingPaths.forEach((release) => release());
      await new Promise((resolve) => setImmediate(resolve));
      assert(
        lateStats === 0,
        "cancelled imports do not start metadata reads after realpath returns",
      );
    } finally {
      fsp.realpath = originalRealpath;
      fsp.lstat = originalLstat;
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
    let progress = 0;
    const firstRead = validator([candidate, ...slow], {
      budgetMs: 20,
      onProgress: (rows) => {
        if (rows.some((e) => e.path === document)) progress++;
      },
    });
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
      "stalled recent-file validation settles as partial at its deadline",
    );
    assert(
      firstResult.entries.some((e) => e.path === document) && progress > 0,
      "readable recent rows publish before stalled metadata finishes",
    );
    assert(
      peak > 0 && peak <= 8,
      "overlapping queries share a limit of eight recent-file metadata reads",
    );
    const before = progress;
    const fallback = await validator([candidate], { budgetMs: 10 });
    assert(
      fallback.partial &&
        fallback.entries.some((e) => e.path === candidate.path),
      "a saturated metadata pool returns cached rows with partial status",
    );
    releases.forEach((release) => release());
    await new Promise((resolve) => setImmediate(resolve));
    assert(
      progress === before && active === 0,
      "late validation results do not publish after the deadline",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
