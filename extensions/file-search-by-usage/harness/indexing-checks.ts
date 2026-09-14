import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { buildSync, transformSync } from "esbuild";
import { DatabaseSync } from "node:sqlite";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * Wait for a condition rather than a fixed number of microtask turns.
 *
 * The rebuild reads the configured scope before it takes the lock, so "the
 * command has started" and "the command holds the lock" are several turns
 * apart. Tests that need the lock held have to wait for it.
 */
async function until(ready: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 2000; i++) {
    if (ready()) return;
    await flush();
  }
  throw new Error(`timed out waiting for ${label}`);
}

/** Loads real command/storage code while replacing Raycast and the slow scans. */
function loadCommand(supportPath: string) {
  const storage = new Map<string, string>();
  const caches = new Map<string, Map<string, string>>();
  const clearing = { before: async () => {} };
  const writing: { before: (key: string) => Promise<void> } = {
    before: async () => {},
  };
  const reading: { before: (key: string) => Promise<void> } = {
    before: async () => {},
  };
  /** Resolvers for the rebuild each test holds open. */
  const scans: ((report: unknown) => void)[] = [];
  const failures: ((error: Error) => void)[] = [];
  const indexScans: ((result: string) => void)[] = [];
  /** Off by default so tests that do not care about the index are unaffected. */
  const indexGate = { pending: false };
  const scanOptions: {
    index: { onProgress?: (message: string) => void }[];
  } = { index: [] };
  const confirmation = { accepted: true };
  const cacheWriting = { fail: false };
  const toasts: { title: string; message?: string; style: string }[] = [];
  const api = {
    environment: { supportPath, launchType: "user" },
    getPreferenceValues: () => ({ fdPath: "" }),
    LaunchType: { UserInitiated: "user" },
    Alert: { ActionStyle: { Destructive: "destructive" } },
    confirmAlert: async () => confirmation.accepted,
    Toast: {
      Style: { Animated: "animated", Failure: "failure", Success: "success" },
    },
    showToast: async (options: (typeof toasts)[number]) => {
      toasts.push(options);
      return options;
    },
    LocalStorage: {
      getItem: async (key: string) => {
        const value = storage.get(key);
        await reading.before(key);
        return value;
      },
      setItem: async (key: string, value: string) => {
        await writing.before(key);
        storage.set(key, value);
      },
      removeItem: async (key: string) => {
        await writing.before(key);
        storage.delete(key);
      },
      allItems: async () => Object.fromEntries(storage),
      clear: async () => {
        await clearing.before();
        storage.clear();
      },
    },
    Cache: class {
      private cache: Map<string, string>;
      private capacity: number;
      constructor({
        namespace,
        capacity = Infinity,
      }: {
        namespace: string;
        capacity?: number;
      }) {
        this.capacity = capacity;
        if (!caches.has(namespace)) caches.set(namespace, new Map());
        this.cache = caches.get(namespace)!;
      }
      get(key: string) {
        return this.cache.get(key);
      }
      set(key: string, value: string) {
        if (cacheWriting.fail) throw new Error("Cache capacity exceeded");
        if (Buffer.byteLength(value, "utf8") > this.capacity) {
          this.cache.delete(key);
          return;
        }
        this.cache.set(key, value);
      }
      clear() {
        this.cache.clear();
      }
    },
  };
  const modules = new Map<string, { exports: unknown }>();
  function load(file: string): unknown {
    if (modules.has(file)) return modules.get(file)!.exports;
    const module = { exports: {} };
    modules.set(file, module);
    const nativeRequire = createRequire(file);
    const localRequire = (id: string) => {
      if (id === "@raycast/api") return api;
      if (id.endsWith("/fd"))
        return {
          findFd: () => ({ kind: "found", path: "/unused", source: "known" }),
          describeFdLookup: () => "",
          FD_DIRECTORIES: [],
          FD_INSTALL_HINT: "",
        };
      // A fixed scope, so these tests do not depend on a mounted Drive.
      if (id.endsWith("/index-settings-store"))
        return {
          loadIndexSettings: async () => ({
            scopes: [supportPath],
            patterns: [],
            includeDrive: false,
            includeHidden: true,
            useIgnoreFiles: false,
          }),
          saveIndexSettings: async () => true,
          resetIndexSettings: async () => true,
        };
      // Stub the crawl but keep the real orchestration, so the lock these
      // tests are about is genuinely taken and released.
      if (id.endsWith("/index-scan")) {
        const real = load(path.resolve("src/lib/index-scan.ts")) as Record<
          string,
          unknown
        >;
        return {
          ...real,
          scanRoots: async (options: { onProgress?: unknown }) => {
            scanOptions.index.push(options);
            return new Promise((resolve, reject) => {
              scans.push(resolve as (report: unknown) => void);
              failures.push(reject);
            });
          },
        };
      }
      if (!id.startsWith(".")) return nativeRequire(id);
      const base = path.resolve(path.dirname(file), id);
      const target = [base + ".ts", base + ".tsx"].find((candidate) =>
        fs.existsSync(candidate),
      );
      if (!target) throw new Error(`Missing test module: ${id}`);
      return load(target);
    };
    const { code } = transformSync(fs.readFileSync(file, "utf8"), {
      loader: "tsx",
      format: "cjs",
    });
    new Function("require", "module", "exports", code)(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  const command = (
    load(path.resolve("src/rebuild-index.tsx")) as {
      default: () => Promise<void>;
    }
  ).default;
  const deleteCommand = (
    load(path.resolve("src/delete-data.tsx")) as {
      default: () => Promise<void>;
    }
  ).default;
  return {
    access: load(
      path.resolve("src/lib/storage-lock.ts"),
    ) as typeof import("../src/lib/storage-lock"),
    usage: load(
      path.resolve("src/lib/usage-cache.ts"),
    ) as typeof import("../src/lib/usage-cache"),
    store: load(
      path.resolve("src/lib/store.ts"),
    ) as typeof import("../src/lib/store"),
    history: load(
      path.resolve("src/lib/history.ts"),
    ) as typeof import("../src/lib/history"),
    // The real settings storage, not the fixed-scope stub the command graph gets.
    settings: load(
      path.resolve("src/lib/index-settings-store.ts"),
    ) as typeof import("../src/lib/index-settings-store"),
    settingsLogic: load(
      path.resolve("src/lib/index-settings.ts"),
    ) as typeof import("../src/lib/index-settings"),
    writing,
    reading,
    command,
    deleteCommand,
    storage,
    caches,
    clearing,
    scans,
    failures,
    toasts,
    scanOptions,
    confirmation,
    cacheWriting,
    setup: fs.existsSync("src/lib/search-setup.ts")
      ? (load(
          path.resolve("src/lib/search-setup.ts"),
        ) as typeof import("../src/lib/search-setup"))
      : undefined,
  };
}

export async function indexingChecks(
  assert: (condition: boolean, label: string) => void,
) {
  console.log("\n=== overlapping indexing ===");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "search-indexing-"));
  const ownedLockCode = buildSync({
    entryPoints: ["src/lib/owned-lock.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
  }).outputFiles[0].text;
  try {
    const test = loadCommand(root);
    const mutation = loadCommand(path.join(root, "mutation"));
    mutation.storage.set("searches", JSON.stringify(["foo"]));
    let resumeWrite!: () => void;
    let startedWrite!: () => void;
    const writeStarted = new Promise<void>((resolve) => {
      startedWrite = resolve;
    });
    mutation.writing.before = async () => {
      startedWrite();
      await new Promise<void>((resolve) => {
        resumeWrite = resolve;
      });
    };
    const oldWrite = mutation.store.recordSearch("bar");
    await writeStarted;
    const mutationDeletion = mutation.deleteCommand();
    for (let i = 0; i < 10; i++) await flush();
    resumeWrite();
    await Promise.all([oldWrite, mutationDeletion]);
    assert(
      !mutation.storage.has("searches"),
      "deletion cannot be undone by an overlapping history write",
    );
    // LocalStorage owns this already-dispatched write until it resolves. Losing
    // the lease afterward cannot cancel its eventual side effect.
    const stalled = loadCommand(path.join(root, "stalled-set-item"));
    stalled.storage.set("searches", JSON.stringify(["foo"]));
    let finishSetItem!: () => void;
    let startSetItem!: () => void;
    const setItemStarted = new Promise<void>((resolve) => {
      startSetItem = resolve;
    });
    stalled.writing.before = async () => {
      startSetItem();
      await new Promise<void>((resolve) => {
        finishSetItem = resolve;
      });
    };
    const stalledWrite = stalled.store.recordSearch("bar").catch(() => {});
    await setItemStarted;
    const realNow = Date.now;
    let elapsed = 660_000;
    try {
      const staleContention = execFileSync(
        process.execPath,
        [
          "-e",
          `
          const mod = {exports:{}};
          new Function('require','module','exports',process.argv[2])(require,mod,mod.exports);
          const now = Date.now(); Date.now = () => now + 660000;
          try {
            const owned = mod.exports.acquireOwnedLock(process.argv[1]);
            owned.release(); process.stdout.write('acquired');
          } catch (error) { process.stdout.write(error.code); }
          `,
          path.join(root, "stalled-set-item", "data-mutation"),
          ownedLockCode,
        ],
        { encoding: "utf8" },
      );
      assert(
        staleContention === "ELOCKED",
        "a separate process cannot recover an expired lock while its storage writer lives",
      );
      // Cross both the stale interval and the bounded acquisition deadline
      // without waiting ten minutes or allowing a heartbeat to refresh it.
      Date.now = () => realNow() + (elapsed += 6000);
      await stalled.deleteCommand();
      assert(
        !stalled.toasts.some((toast) => toast.title === "Deleted everything") &&
          stalled.storage.get("searches") === JSON.stringify(["foo"]),
        "deletion cannot take over a live writer stalled in setItem beyond expiry",
      );
    } finally {
      Date.now = realNow;
      finishSetItem();
      await stalledWrite;
    }
    assert(
      JSON.parse(stalled.storage.get("searches") ?? "[]").includes("bar"),
      "the dispatched storage write can finish after the attempted stale takeover",
    );
    await stalled.deleteCommand();
    assert(
      stalled.storage.size === 0 &&
        stalled.toasts.some((toast) => toast.title === "Deleted everything"),
      "deletion succeeds after the stalled writer finishes and releases ownership",
    );
    mutation.writing.before = async () => {};
    const generation = mutation.access.dataGeneration();
    await mutation.deleteCommand();
    const staleWrite = await mutation.store
      .recordSearch("baz", generation)
      .then(
        () => false,
        () => true,
      );
    assert(
      staleWrite && !mutation.storage.has("searches"),
      "a pre-deletion query cannot save after the reset",
    );
    await mutation.usage.writeCachedUsage(
      "/foo",
      new Map([["/foo/old.txt", { useCount: 1 }]]),
      generation,
    );
    assert(
      [...mutation.caches.values()].every((cache) => cache.size === 0),
      "pre-deletion search and metadata completions cannot refill caches",
    );
    await Promise.all([
      mutation.store.recordSearch("foo"),
      mutation.store.recordSearch("bar"),
    ]);
    assert(
      JSON.parse(mutation.storage.get("searches") ?? "[]").length === 2,
      "concurrent history writes preserve both queries",
    );
    const ownership = loadCommand(path.join(root, "storage-ownership"));
    const mutationLock = path.join(
      root,
      "storage-ownership",
      "data-mutation.lock",
    );
    await ownership.access
      .withStorageLock(async () => {
        fs.renameSync(mutationLock, mutationLock + "-old");
        fs.mkdirSync(mutationLock);
      }, undefined)
      .catch(() => {});
    assert(
      fs.existsSync(mutationLock),
      "an old storage writer cannot remove a successor's lock",
    );
    const suspended = loadCommand(path.join(root, "suspended-writer"));
    suspended.storage.set("searches", JSON.stringify(["foo"]));
    let resumeRead!: () => void;
    let beginRead!: () => void;
    const readStarted = new Promise<void>((resolve) => {
      beginRead = resolve;
    });
    suspended.reading.before = async () => {
      beginRead();
      await new Promise<void>((resolve) => {
        resumeRead = resolve;
      });
    };
    const suspendedWrite = suspended.store.recordSearch("bar").catch(() => {});
    await readStarted;
    const suspendedLock = path.join(
      root,
      "suspended-writer",
      "data-mutation.lock",
    );
    fs.renameSync(suspendedLock, suspendedLock + "-old");
    fs.mkdirSync(suspendedLock);
    suspended.access.invalidateData();
    suspended.storage.clear();
    resumeRead();
    await suspendedWrite;
    assert(
      suspended.storage.size === 0,
      "a suspended writer checks reset and ownership before saving old data",
    );
    const expired = loadCommand(path.join(root, "expired-writer"));
    const expiredLock = path.join(root, "expired-writer", "data-mutation.lock");
    const originalNow = Date.now;
    const expiredResult = await expired.access
      .withStorageLock(async () => {
        Date.now = () => originalNow() + 660_000;
      }, undefined)
      .then(
        () => false,
        () => true,
      )
      .finally(() => {
        Date.now = originalNow;
      });
    assert(
      expiredResult && !fs.existsSync(expiredLock),
      "expired work rejects its result but releases its own unchanged lock",
    );
    const first = test.command();
    await until(
      () => test.scans.length === 1,
      "the first scan to hold the lock",
    );
    const second = test.command();
    // Let the second command either acquire the lock or report contention.
    for (let i = 0; i < 400; i++) await flush();
    assert(
      test.scans.length === 1,
      "overlapping manual indexing does not start a second scan",
    );
    const contention = execFileSync(
      process.execPath,
      [
        "-e",
        `
      const { lockSync } = require('proper-lockfile');
      try { const release = lockSync(process.argv[1], {realpath:false, stale:600000, update:1000}); release(); process.stdout.write('acquired'); }
      catch (error) { process.stdout.write(error.code); }
    `,
        path.join(root, "google-drive-indexing"),
      ],
      { encoding: "utf8" },
    );
    assert(
      contention === "ELOCKED",
      "a separate process cannot index while a command holds the lock",
    );
    // What a finished scan hands back to rebuildIndex.
    const good = {
      roots: [
        { root: "/foo", scanned: 1, indexed: 1, elapsedMs: 1, complete: true },
      ],
      scanned: 1,
      indexed: 1,
      elapsedMs: 1,
      complete: true,
      forgotten: [] as string[],
    };
    const deletion = loadCommand(path.join(root, "deletion"));
    deletion.storage.set("pins", JSON.stringify(["/foo"]));
    const activeScan = deletion.command();
    await until(
      () => deletion.scans.length === 1,
      "the first scan to hold the lock",
    );
    await deletion.deleteCommand();
    assert(
      deletion.storage.has("pins"),
      "deletion leaves data untouched while indexing holds the lock",
    );
    assert(
      !deletion.toasts.some((t) => t.title === "Deleted everything"),
      "blocked deletion never reports success",
    );
    deletion.scans[0](good);
    await activeScan;
    await deletion.deleteCommand();
    assert(
      deletion.storage.size === 0 &&
        [...deletion.caches.values()].every((c) => c.size === 0),
      "retrying deletion after indexing clears every store",
    );
    assert(
      deletion.toasts.some((t) => t.title === "Deleted everything"),
      "completed deletion reports success",
    );

    let finishClear!: () => void;
    let beginClear!: () => void;
    const clearStarted = new Promise<void>((resolve) => {
      beginClear = resolve;
    });
    deletion.clearing.before = () =>
      new Promise<void>((resolve) => {
        finishClear = resolve;
        beginClear();
      });
    const activeDelete = deletion.deleteCommand();
    await clearStarted;
    const blockedScan = deletion.command();
    // Give a regression time to wrongly start a scan, then check none did.
    for (let i = 0; i < 400; i++) await flush();
    assert(
      deletion.scans.length === 1,
      "indexing cannot start while deletion holds the lock",
    );
    // Let an incorrectly started scan finish so a regression cannot hang the harness.
    deletion.scans[1]?.(good);
    await blockedScan;
    finishClear();
    await activeDelete;
    deletion.toasts.length = 0;
    deletion.clearing.before = async () => {
      throw new Error("Synthetic storage failure");
    };
    await deletion.deleteCommand();
    assert(
      !deletion.toasts.some((t) => t.title === "Deleted everything") &&
        deletion.toasts.some((t) => t.style === "failure"),
      "a storage deletion failure reports failure rather than success",
    );
    assert(
      !fs.existsSync(path.join(root, "deletion", "google-drive-indexing.lock")),
      "a deletion failure releases the shared lock",
    );
    // The blocked request must settle rather than wait on the held lock.
    test.scans[0](good);
    await Promise.all([first, second]);
    assert(
      test.scans.length === 1,
      "the blocked request finishes without ever starting its own scan",
    );
    assert(
      test.toasts.some(
        (toast) =>
          toast.style === "failure" &&
          /Wait for indexing/.test(toast.message ?? ""),
      ),
      "a duplicate request explains that it must wait for indexing or deletion",
    );

    // Wait for this run's own scan, not the resolved one from earlier.
    const before = test.failures.length;
    test.toasts.length = 0;
    const failed = test.command();
    await until(() => test.failures.length > before, "the next scan to start");
    test.failures[before](new Error("Synthetic scan failure"));
    await failed;
    assert(
      test.toasts.some(
        (toast) =>
          toast.style === "failure" &&
          toast.message?.includes("Synthetic scan failure"),
      ),
      "the real command reports scan errors instead of treating them as lock contention",
    );
    assert(
      !fs.existsSync(path.join(root, "google-drive-indexing.lock")),
      "a scan exception releases the indexing lock",
    );

    test.toasts.length = 0;
    const beforeFinalization = test.scans.length;
    const finalizing = test.command();
    await until(
      () => test.scans.length > beforeFinalization,
      "the finalization test to hold the lock",
    );
    const damaged = new DatabaseSync(path.join(root, "file-index.sqlite"));
    try {
      damaged.exec("DROP TABLE files_fts");
    } finally {
      damaged.close();
    }
    test.scans[beforeFinalization](good);
    await finalizing;
    assert(
      test.toasts.some(
        (toast) =>
          toast.style === "failure" && toast.message?.includes("files_fts"),
      ),
      "the real rebuild command preserves the FTS finalization error through its lock wrapper",
    );

    const replacementTest = loadCommand(path.join(root, "replacement"));
    const superseded = replacementTest.command();
    await until(
      () => replacementTest.scans.length === 1,
      "the superseded scan to hold the lock",
    );
    const lock = path.join(root, "replacement", "google-drive-indexing.lock");
    fs.renameSync(lock, `${lock}.old`);
    fs.mkdirSync(lock);
    replacementTest.scans[0](good);
    await superseded;
    assert(
      fs.existsSync(lock),
      "finishing an old run does not remove a replacement lock",
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert(
      fs.existsSync(lock),
      "an old heartbeat leaves a replacement lock intact",
    );
    const exitRoot = path.join(root, "exit");
    const exitCode = buildSync({
      entryPoints: ["src/lib/indexing-lock.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      external: ["@raycast/api"],
      write: false,
    }).outputFiles[0].text;
    execFileSync(process.execPath, [
      "-e",
      `
      const fs = require('node:fs');
      const root = process.argv[1];
      const api = { environment: {supportPath:root}, Toast:{Style:{Failure:'failure'}}, showToast:async()=>({}) };
      const mod = {exports:{}};
      new Function('require','module','exports',process.argv[2])(id => id === '@raycast/api' ? api : require(id),mod,mod.exports);
      mod.exports.withIndexingLock(async () => {
        const lock = root + '/google-drive-indexing.lock';
        fs.renameSync(lock, lock + '.old'); fs.mkdirSync(lock);
        process.exit(0);
      });
    `,
      exitRoot,
      exitCode,
    ]);
    assert(
      fs.existsSync(path.join(exitRoot, "google-drive-indexing.lock")),
      "process-exit cleanup cannot remove a replacement lock",
    );

    const recoveryRoot = path.join(root, "recovery");
    const staleLock = path.join(recoveryRoot, "google-drive-indexing.lock");
    fs.mkdirSync(recoveryRoot);
    try {
      execFileSync(process.execPath, [
        "-e",
        `
        const mod = {exports:{}};
        new Function('require','module','exports',process.argv[2])(require,mod,mod.exports);
        mod.exports.acquireOwnedLock(process.argv[1]);
        process.kill(process.pid, 'SIGKILL');
        `,
        path.join(recoveryRoot, "google-drive-indexing"),
        ownedLockCode,
      ]);
      throw new Error("Crash fixture did not terminate");
    } catch (error) {
      if ((error as { signal?: string }).signal !== "SIGKILL") throw error;
    }
    const oldTime = new Date(Date.now() - 660_000);
    fs.utimesSync(staleLock, oldTime, oldTime);
    const recovery = loadCommand(recoveryRoot);
    const recovered = recovery.command();
    await until(
      () => recovery.scans.length === 1,
      "the recovered scan to start",
    );
    assert(
      recovery.scans.length === 1,
      "a stale lock left after a crash does not block future indexing",
    );
    recovery.scans[0]?.(good);
    await recovered;
    assert(
      !fs.existsSync(staleLock),
      "a recovered indexing run releases its own lock",
    );
    for (const metadata of ["missing", "malformed"] as const) {
      const unknownRoot = path.join(root, `unknown-owner-${metadata}`);
      const unknownLock = path.join(unknownRoot, "google-drive-indexing.lock");
      fs.mkdirSync(unknownLock, { recursive: true });
      if (metadata === "malformed")
        fs.writeFileSync(path.join(unknownLock, "owner-invalid"), "invalid");
      fs.utimesSync(unknownLock, oldTime, oldTime);
      const unknown = loadCommand(unknownRoot);
      const attempted = unknown.command();
      // It either acquires the lock and starts a scan, or reports contention
      // and returns. Waiting on whichever happens keeps a regression from
      // leaving an unresolved scan, which would end the run silently.
      let reported = false;
      void attempted.then(() => {
        reported = true;
      });
      await until(
        () => reported || unknown.scans.length > 0,
        "the attempt to acquire the lock or report contention",
      );
      const acquired = unknown.scans.length > 0;
      unknown.scans[0]?.(good);
      await attempted;
      assert(
        !acquired && fs.existsSync(unknownLock),
        `stale ${metadata} ownership metadata cannot prove a writer is dead`,
      );
    }
    await visitWriteChecks(assert, root);
    await rankingWriteChecks(assert, root);
    await indexSettingsStoreChecks(assert, root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/** A stored visit, in the shape decay and pruning read it back in. */
type StoredVisit = {
  count: number;
  lastVisit: number;
  ems: number;
  tick: number;
};

type StoredLog = { tick: number; items: Record<string, StoredVisit> };

/** pruneVisits' MIN_EMS floor, which the module does not export. */
const PRUNE_FLOOR = 0.01;

const seedVisit = (ems: number, tick: number, count = 1): StoredVisit => ({
  count,
  lastVisit: 0,
  ems,
  tick,
});

const storedLog = (storage: Map<string, string>): StoredLog | undefined => {
  const raw = storage.get("visits");
  return raw === undefined ? undefined : (JSON.parse(raw) as StoredLog);
};

/**
 * A command instance whose support directory already exists.
 *
 * withStorageLock creates it on the first write, but invalidateData does not,
 * and these tests move the generation before anything has been written.
 */
function storeAt(supportPath: string) {
  fs.mkdirSync(supportPath, { recursive: true });
  return loadCommand(supportPath);
}

/**
 * Occupy the storage lock until released.
 *
 * Generation-free, so a reset during the test cannot cancel the holder itself
 * and leave the lock behind.
 */
function holdStorageLock(access: typeof import("../src/lib/storage-lock")) {
  let release!: () => void;
  let taken!: () => void;
  const started = new Promise<void>((resolve) => {
    taken = resolve;
  });
  const done = access.withStorageLock(async () => {
    taken();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  }, undefined);
  return {
    taken: started,
    release: async () => {
      release();
      await done;
    },
  };
}

/** Real files, plus a symlinked alias, so canonical keys are unambiguous. */
function visitFixture(root: string) {
  const files = path.join(root, "visit-files");
  fs.mkdirSync(files, { recursive: true });
  const openedPath = path.join(files, "opened.txt");
  const otherPath = path.join(files, "other.txt");
  fs.writeFileSync(openedPath, "");
  fs.writeFileSync(otherPath, "");
  const aliasDir = path.join(root, "visit-alias");
  fs.symlinkSync(files, aliasDir);
  return {
    openedPath,
    otherPath,
    aliasPath: path.join(aliasDir, "opened.txt"),
    // A path under a directory that was never created, so it cannot exist.
    missingPath: path.join(files, "gone", "deleted.txt"),
    opened: fs.realpathSync(openedPath),
    other: fs.realpathSync(otherPath),
  };
}

async function visitWriteChecks(
  assert: (condition: boolean, label: string) => void,
  root: string,
) {
  console.log("\n=== visit log writes ===");
  const files = visitFixture(path.join(root, "visits"));
  const { openedPath, otherPath, aliasPath, missingPath, opened, other } =
    files;

  const first = storeAt(path.join(root, "visits", "first"));
  const startedAt = Date.now();
  const written = await first.store.recordVisit(openedPath);
  const finishedAt = Date.now();
  const stored = storedLog(first.storage);
  assert(
    stored !== undefined && stored.tick === 1 && written.tick === 1,
    "the first recorded visit starts the event clock at one",
  );
  const entry = stored?.items[opened];
  assert(
    entry?.count === 1 && entry?.ems === 1 && entry?.tick === 0,
    "a first visit stores one open with a full ems at the previous tick",
  );
  assert(
    (entry?.lastVisit ?? -1) >= startedAt &&
      (entry?.lastVisit ?? -1) <= finishedAt,
    "a first visit stores the wall-clock time of the open",
  );
  assert(
    Object.keys(stored?.items ?? {}).length === 1,
    "an empty store gains exactly the one visited path",
  );

  const repeated = await first.store.recordVisit(openedPath);
  const again = storedLog(first.storage)?.items[opened];
  const decayed = Math.exp(-first.history.LAMBDA) + 1;
  assert(
    repeated.tick === 2 && again?.tick === 1 && again?.count === 2,
    "a repeated visit to one path advances the clock and counts both opens",
  );
  assert(
    Math.abs((again?.ems ?? 0) - decayed) < 1e-12,
    "a repeated visit adds one to the ems decayed over the elapsed tick",
  );

  const aliased = await first.store.recordVisit(aliasPath);
  assert(
    aliased.items[opened]?.count === 3 &&
      aliased.items[aliasPath] === undefined,
    "a visit through a symlinked alias merges into the canonical path",
  );

  const generationTest = storeAt(path.join(root, "visits", "generation"));
  const generation = generationTest.access.dataGeneration();
  generationTest.access.invalidateData();
  const refused = await generationTest.store
    .recordVisit(openedPath, generation)
    .then(
      () => false,
      () => true,
    );
  assert(
    refused && !generationTest.storage.has("visits"),
    "a visit captured before a reset cannot land afterwards",
  );
  await generationTest.store.recordVisit(
    openedPath,
    generationTest.access.dataGeneration(),
  );
  assert(
    generationTest.storage.has("visits"),
    "a visit captured after a reset still lands",
  );

  const pruning: {
    label: string;
    logTick: number;
    visit: StoredVisit;
    keeps: boolean;
  }[] = [
    {
      label: "a full-ems entry survives a recorded visit",
      logTick: 0,
      visit: seedVisit(1, 0),
      keeps: true,
    },
    {
      label: "an entry above the pruning floor survives a recorded visit",
      logTick: 0,
      visit: seedVisit(0.02, 0),
      keeps: true,
    },
    {
      label: "an entry below the pruning floor is pruned",
      logTick: 0,
      visit: seedVisit(0.005, 0),
      keeps: false,
    },
    {
      // emsScore floors the elapsed ticks at zero, so this entry is undecayed
      // and sits exactly on the inclusive floor.
      label: "an entry exactly on the pruning floor survives",
      logTick: 0,
      visit: seedVisit(PRUNE_FLOOR, 1),
      keeps: true,
    },
    {
      label: "a zero-ems entry is pruned",
      logTick: 0,
      visit: seedVisit(0, 0),
      keeps: false,
    },
    {
      label: "a negative-ems entry is pruned",
      logTick: 0,
      visit: seedVisit(-1, 0),
      keeps: false,
    },
    {
      label: "an entry decayed under the floor by an old tick is pruned",
      logTick: 1000,
      visit: seedVisit(1, 99),
      keeps: false,
    },
    {
      label: "an entry still above the floor at an old tick survives",
      logTick: 700,
      visit: seedVisit(1, 0),
      keeps: true,
    },
    {
      // JSON cannot carry NaN, so a broken ems reads back as null and the
      // stored open count stands in for it.
      label: "an entry with no usable ems falls back to its open count",
      logTick: 0,
      visit: seedVisit(null as unknown as number, 0, 3),
      keeps: true,
    },
    {
      label: "an entry with neither a usable ems nor an open count is pruned",
      logTick: 0,
      visit: seedVisit(null as unknown as number, 0, 0),
      keeps: false,
    },
  ];
  const prune = storeAt(path.join(root, "visits", "pruning"));
  for (const item of pruning) {
    prune.storage.set(
      "visits",
      JSON.stringify({ tick: item.logTick, items: { [other]: item.visit } }),
    );

    await prune.store.recordVisit(openedPath);

    const keys = Object.keys(storedLog(prune.storage)?.items ?? {});
    assert(
      keys.includes(opened) && keys.includes(other) === item.keeps,
      item.label,
    );
  }

  prune.storage.set(
    "visits",
    JSON.stringify({ tick: 0, items: { [missingPath]: seedVisit(1, 0) } }),
  );
  const gated = await prune.store.recordVisit(openedPath);
  assert(
    gated.items[missingPath] !== undefined,
    "an entry for a deleted file survives while nothing is pruned",
  );
  prune.storage.set(
    "visits",
    JSON.stringify({
      tick: 0,
      items: { [missingPath]: seedVisit(1, 0), [other]: seedVisit(0, 0) },
    }),
  );
  const swept = await prune.store.recordVisit(openedPath);
  assert(
    swept.items[missingPath] === undefined && swept.items[opened] !== undefined,
    "a visit that prunes also forgets entries whose file is gone",
  );

  const cap = prune.history.MAX_ENTRIES;
  const capCases: { label: string; seeded: number; kept: number }[] = [
    {
      label: "a log at exactly the entry cap keeps every entry",
      seeded: cap - 1,
      kept: cap,
    },
    {
      label: "a log over the entry cap drops to the cap and sweeps the missing",
      seeded: cap,
      kept: 1,
    },
  ];
  for (const item of capCases) {
    const items: Record<string, StoredVisit> = {};
    for (let i = 0; i < item.seeded; i++)
      items[path.join(root, "visits", "gone", `fake-${i}`)] = seedVisit(0.5, 0);
    prune.storage.set("visits", JSON.stringify({ tick: 0, items }));

    await prune.store.recordVisit(openedPath);

    assert(
      Object.keys(storedLog(prune.storage)?.items ?? {}).length === item.kept,
      item.label,
    );
  }

  const reset = storeAt(path.join(root, "visits", "reset"));
  reset.storage.set(
    "visits",
    JSON.stringify({
      tick: 7,
      items: {
        [opened]: seedVisit(1, 0),
        [aliasPath]: seedVisit(1, 0),
        [other]: seedVisit(1, 0),
      },
    }),
  );

  const afterReset = await reset.store.resetVisit(aliasPath);

  assert(
    afterReset.tick === 7 && Object.keys(afterReset.items).join() === other,
    "resetting a path drops its canonical and its raw key and keeps the clock",
  );
  assert(
    Object.keys(storedLog(reset.storage)?.items ?? {}).join() === other,
    "a reset visit is persisted, not only returned",
  );
  const resetAgain = await reset.store.resetVisit(aliasPath);
  assert(
    Object.keys(resetAgain.items).join() === other,
    "resetting the same path twice changes nothing the second time",
  );
  reset.storage.delete("visits");
  const resetEmpty = await reset.store.resetVisit(openedPath);
  assert(
    resetEmpty.tick === 0 &&
      Object.keys(resetEmpty.items).length === 0 &&
      Object.keys(storedLog(reset.storage)?.items ?? { x: seedVisit(1, 0) })
        .length === 0,
    "resetting a path in an empty store writes an empty log",
  );

  const suspendedReset = storeAt(path.join(root, "visits", "reset-stale"));
  const seeded = JSON.stringify({
    tick: 3,
    items: { [opened]: seedVisit(1, 0) },
  });
  suspendedReset.storage.set("visits", seeded);
  let resumeReset!: () => void;
  let beganReset!: () => void;
  const resetRead = new Promise<void>((resolve) => {
    beganReset = resolve;
  });
  suspendedReset.reading.before = async (key: string) => {
    if (key !== "visits") return;
    beganReset();
    await new Promise<void>((resolve) => {
      resumeReset = resolve;
    });
  };
  const staleReset = suspendedReset.store.resetVisit(openedPath).then(
    () => false,
    () => true,
  );
  await resetRead;
  suspendedReset.access.invalidateData();
  resumeReset();
  const resetRejected = await staleReset;
  suspendedReset.reading.before = async () => {};
  assert(
    resetRejected && suspendedReset.storage.get("visits") === seeded,
    "a reset suspended across a data reset cannot save its old log",
  );

  const clear = storeAt(path.join(root, "visits", "clear"));
  clear.storage.set("visits", seeded);
  clear.storage.set("pins", JSON.stringify([opened]));

  const cleared = await clear.store.clearVisits();

  assert(
    cleared.tick === 0 &&
      Object.keys(cleared.items).length === 0 &&
      !clear.storage.has("visits"),
    "clearing visits removes the stored log",
  );
  assert(
    clear.storage.has("pins"),
    "clearing visits leaves the other stored ranking data alone",
  );
  const clearedAgain = await clear.store.clearVisits();
  assert(
    Object.keys(clearedAgain.items).length === 0 &&
      !clear.storage.has("visits"),
    "clearing an empty visit log is a no-op that creates nothing",
  );

  const blocked = storeAt(path.join(root, "visits", "clear-stale"));
  blocked.storage.set("visits", seeded);
  const held = holdStorageLock(blocked.access);
  await held.taken;
  const blockedClear = blocked.store.clearVisits().then(
    () => false,
    () => true,
  );
  for (let i = 0; i < 10; i++) await flush();
  blocked.access.invalidateData();
  await held.release();
  const clearRejected = await blockedClear;
  assert(
    clearRejected && blocked.storage.get("visits") === seeded,
    "a clear waiting on the storage lock is cancelled by a reset it did not see",
  );
}

async function rankingWriteChecks(
  assert: (condition: boolean, label: string) => void,
  root: string,
) {
  console.log("\n=== abbreviation, pin and search writes ===");
  const files = visitFixture(path.join(root, "ranking"));
  const { openedPath, otherPath, aliasPath, opened, other } = files;

  const abbreviations = storeAt(path.join(root, "ranking", "abbrev"));
  const learned = await abbreviations.store.recordAbbreviation(
    "  GDoc  ",
    aliasPath,
  );
  assert(
    JSON.stringify(learned) === JSON.stringify({ gdoc: { [opened]: 1 } }) &&
      abbreviations.storage.get("abbreviations") === JSON.stringify(learned),
    "a first abbreviation is stored trimmed, lower case and canonical",
  );
  const reinforced = await abbreviations.store.recordAbbreviation(
    "gdoc",
    openedPath,
  );
  assert(
    reinforced.gdoc?.[opened] === 2 &&
      Object.keys(reinforced.gdoc ?? {}).length === 1,
    "learning the same pairing again reinforces the single entry",
  );
  const secondTarget = await abbreviations.store.recordAbbreviation(
    "gdoc",
    otherPath,
  );
  assert(
    secondTarget.gdoc?.[opened] === 2 && secondTarget.gdoc?.[other] === 1,
    "a second target for one query is learned alongside the first",
  );

  const untouched = abbreviations.storage.get("abbreviations");
  // Rewriting the same value is still a write, so watch the keys, not the value.
  const writes: string[] = [];
  abbreviations.writing.before = async (key: string) => {
    writes.push(key);
  };
  for (const blank of ["", "   ", "\t\n"]) {
    writes.length = 0;

    const unchanged = await abbreviations.store.recordAbbreviation(
      blank,
      openedPath,
    );

    assert(
      JSON.stringify(unchanged) === untouched &&
        abbreviations.storage.get("abbreviations") === untouched &&
        writes.length === 0,
      `an abbreviation for the query ${JSON.stringify(blank)} is not learned`,
    );
  }
  abbreviations.writing.before = async () => {};
  const blankOnly = storeAt(path.join(root, "ranking", "abbrev-blank"));
  const nothingLearned = await blankOnly.store.recordAbbreviation(
    "   ",
    openedPath,
  );
  assert(
    Object.keys(nothingLearned).length === 0 &&
      !blankOnly.storage.has("abbreviations"),
    "a blank query against an empty store learns nothing and writes nothing",
  );
  const abbrevGeneration = abbreviations.access.dataGeneration();
  abbreviations.access.invalidateData();
  const abbrevRefused = await abbreviations.store
    .recordAbbreviation("gdoc", openedPath, abbrevGeneration)
    .then(
      () => false,
      () => true,
    );
  assert(
    abbrevRefused && abbreviations.storage.get("abbreviations") === untouched,
    "an abbreviation chosen before a reset cannot land afterwards",
  );

  const pinCases: {
    label: string;
    stored: string | undefined;
    target: string;
    next: string[];
  }[] = [
    {
      label: "toggling a path with nothing stored pins it",
      stored: undefined,
      target: openedPath,
      next: [opened],
    },
    {
      label: "toggling a pinned path unpins it",
      stored: JSON.stringify([opened]),
      target: openedPath,
      next: [],
    },
    {
      label: "toggling an alias of a pinned path unpins the canonical entry",
      stored: JSON.stringify([opened]),
      target: aliasPath,
      next: [],
    },
    {
      label: "toggling a new path appends it after the existing pins",
      stored: JSON.stringify([other]),
      target: openedPath,
      next: [other, opened],
    },
    {
      label: "toggling against malformed stored pins starts a fresh list",
      stored: "{not json",
      target: openedPath,
      next: [opened],
    },
    {
      label: "toggling against a non-array pin value starts a fresh list",
      stored: '"pinned"',
      target: openedPath,
      next: [opened],
    },
    {
      label: "toggling drops non-string entries from the stored pins",
      stored: JSON.stringify([7, opened]),
      target: otherPath,
      next: [opened, other],
    },
  ];
  const pins = storeAt(path.join(root, "ranking", "pins"));
  for (const item of pinCases) {
    if (item.stored === undefined) pins.storage.delete("pins");
    else pins.storage.set("pins", item.stored);

    const next = await pins.store.togglePin(item.target);

    assert(
      JSON.stringify(next) === JSON.stringify(item.next) &&
        pins.storage.get("pins") === JSON.stringify(item.next),
      item.label,
    );
  }

  const suspendedPin = storeAt(path.join(root, "ranking", "pins-stale"));
  const pinned = JSON.stringify([other]);
  suspendedPin.storage.set("pins", pinned);
  let resumePin!: () => void;
  let beganPin!: () => void;
  const pinRead = new Promise<void>((resolve) => {
    beganPin = resolve;
  });
  suspendedPin.reading.before = async (key: string) => {
    if (key !== "pins") return;
    beganPin();
    await new Promise<void>((resolve) => {
      resumePin = resolve;
    });
  };
  const stalePin = suspendedPin.store.togglePin(openedPath).then(
    () => false,
    () => true,
  );
  await pinRead;
  suspendedPin.access.invalidateData();
  resumePin();
  const pinRejected = await stalePin;
  suspendedPin.reading.before = async () => {};
  assert(
    pinRejected && suspendedPin.storage.get("pins") === pinned,
    "a pin toggle suspended across a data reset cannot save its old list",
  );

  const capped = Array.from({ length: 30 }, (_, i) => `query-${i}`);
  const searchCases: {
    label: string;
    stored: string | undefined;
    query: string;
    next: string[];
    writes: boolean;
  }[] = [
    {
      label: "the first recorded search is the whole history",
      stored: undefined,
      query: "report",
      next: ["report"],
      writes: true,
    },
    {
      label: "a repeated search moves to the front without duplicating",
      stored: JSON.stringify(["alpha", "report", "beta"]),
      query: "  report  ",
      next: ["report", "alpha", "beta"],
      writes: true,
    },
    {
      label: "a history at the cap drops its oldest query",
      stored: JSON.stringify(capped),
      query: "newest",
      next: ["newest", ...capped.slice(0, 29)],
      writes: true,
    },
    {
      label: "malformed stored history starts fresh",
      stored: "{not json",
      query: "report",
      next: ["report"],
      writes: true,
    },
    {
      label: "a blank search leaves a stored history untouched",
      stored: JSON.stringify(["alpha"]),
      query: "   ",
      next: ["alpha"],
      writes: true,
    },
    {
      label: "a blank search against nothing stored writes nothing",
      stored: undefined,
      query: "   ",
      next: [],
      writes: false,
    },
  ];
  const searches = storeAt(path.join(root, "ranking", "searches"));
  for (const item of searchCases) {
    if (item.stored === undefined) searches.storage.delete("searches");
    else searches.storage.set("searches", item.stored);

    const next = await searches.store.recordSearch(item.query);

    assert(
      JSON.stringify(next) === JSON.stringify(item.next) &&
        searches.storage.has("searches") === item.writes &&
        (!item.writes ||
          searches.storage.get("searches") === JSON.stringify(item.next)),
      item.label,
    );
  }
}

async function indexSettingsStoreChecks(
  assert: (condition: boolean, label: string) => void,
  root: string,
) {
  console.log("\n=== index settings storage ===");
  const test = storeAt(path.join(root, "index-settings-store"));
  const { DEFAULT_SETTINGS, SETTINGS_KEY, serializeSettings } =
    test.settingsLogic;
  type Settings = import("../src/lib/index-settings").IndexSettings;
  const same = (a: Settings, b: Settings) =>
    a.scopes.join("\u0000") === b.scopes.join("\u0000") &&
    a.patterns.join("\u0000") === b.patterns.join("\u0000") &&
    a.includeDrive === b.includeDrive &&
    a.includeHidden === b.includeHidden &&
    a.useIgnoreFiles === b.useIgnoreFiles;
  const custom: Settings = {
    scopes: ["/Users/someone/Reports"],
    patterns: ["*.log"],
    includeDrive: false,
    includeHidden: true,
    useIgnoreFiles: true,
  };

  const loadCases: {
    label: string;
    stored: string | undefined;
    expected: Settings;
  }[] = [
    {
      label: "absent stored settings load as the defaults",
      stored: undefined,
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "an empty stored value loads as the defaults",
      stored: "",
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "malformed stored json loads as the defaults",
      stored: '{"scopes":',
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "a stored number loads as the defaults",
      stored: "42",
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "a stored null loads as the defaults",
      stored: "null",
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "valid stored settings load back exactly as written",
      stored: serializeSettings(custom),
      expected: custom,
    },
    {
      // A truncated or hand-edited file must not load as nothing to index.
      label: "stored settings with no fields fall back per field",
      stored: "{}",
      expected: DEFAULT_SETTINGS,
    },
    {
      // Distinct from the case above: emptied on purpose, so it stays empty.
      label:
        "stored empty lists stay empty, because removing every scope means it",
      stored: JSON.stringify({ scopes: [], patterns: [] }),
      expected: {
        scopes: [],
        patterns: [],
        includeDrive: DEFAULT_SETTINGS.includeDrive,
        includeHidden: DEFAULT_SETTINGS.includeHidden,
        useIgnoreFiles: DEFAULT_SETTINGS.useIgnoreFiles,
      },
    },
    {
      label:
        "a non-list scopes field falls back rather than emptying the scope",
      stored: JSON.stringify({ scopes: "/not/a/list" }),
      expected: DEFAULT_SETTINGS,
    },
    {
      label: "stored lists lose their blank, duplicate and non-string entries",
      stored: JSON.stringify({
        scopes: ["/a", "  ", "/a", 7, "/b"],
        patterns: ["*.log", "*.log"],
      }),
      expected: {
        scopes: ["/a", "/b"],
        patterns: ["*.log"],
        includeDrive: DEFAULT_SETTINGS.includeDrive,
        includeHidden: DEFAULT_SETTINGS.includeHidden,
        useIgnoreFiles: DEFAULT_SETTINGS.useIgnoreFiles,
      },
    },
  ];
  for (const item of loadCases) {
    if (item.stored === undefined) test.storage.delete(SETTINGS_KEY);
    else test.storage.set(SETTINGS_KEY, item.stored);

    const loaded = await test.settings.loadIndexSettings();

    assert(same(loaded, item.expected), item.label);
  }

  test.storage.set(SETTINGS_KEY, serializeSettings(custom));
  test.reading.before = async (key: string) => {
    if (key === SETTINGS_KEY) throw new Error("Synthetic storage failure");
  };
  const afterReadFailure = await test.settings.loadIndexSettings().then(
    (settings) => settings,
    () => undefined,
  );
  test.reading.before = async () => {};
  assert(
    afterReadFailure !== undefined && same(afterReadFailure, DEFAULT_SETTINGS),
    "a settings read that throws loads the defaults rather than failing",
  );

  const fresh = storeAt(path.join(root, "index-settings-save"));
  const saved = await fresh.settings.saveIndexSettings(custom);
  assert(
    saved && fresh.storage.get(SETTINGS_KEY) === serializeSettings(custom),
    "saving into an empty store reports success and writes the settings",
  );
  const widened: Settings = { ...custom, scopes: [...custom.scopes, "/extra"] };
  const resaved = await fresh.settings.saveIndexSettings(widened);
  assert(
    resaved && fresh.storage.get(SETTINGS_KEY) === serializeSettings(widened),
    "saving again replaces the stored settings",
  );
  const bogus = await fresh.settings.saveIndexSettings(
    custom,
    "not-a-generation",
  );
  assert(
    bogus === "reset" &&
      fresh.storage.get(SETTINGS_KEY) === serializeSettings(widened),
    "a save against an unknown generation is refused as a reset, not written",
  );
  const generation = fresh.access.dataGeneration();
  fresh.access.invalidateData();
  const stale = await fresh.settings.saveIndexSettings(custom, generation);
  assert(
    stale === "reset" &&
      fresh.storage.get(SETTINGS_KEY) === serializeSettings(widened),
    "an edit begun before a reset is refused rather than saved over the reset",
  );

  const contended = storeAt(path.join(root, "index-settings-contended"));
  const held = holdStorageLock(contended.access);
  await held.taken;

  const pending = contended.settings.saveIndexSettings(custom);
  for (let i = 0; i < 20; i++) await flush();
  const wroteEarly = contended.storage.has(SETTINGS_KEY);
  await held.release();
  const landed = await pending;

  assert(
    !wroteEarly &&
      landed &&
      contended.storage.get(SETTINGS_KEY) === serializeSettings(custom),
    "a save waits for another storage writer and then lands",
  );

  contended.writing.before = async (key: string) => {
    if (key === SETTINGS_KEY) throw new Error("Synthetic storage failure");
  };
  const writeFailure = await contended.settings.saveIndexSettings(widened);
  contended.writing.before = async () => {};
  assert(
    writeFailure === "failed" &&
      contended.storage.get(SETTINGS_KEY) === serializeSettings(custom),
    "a settings write that throws reports a failure, not a data reset",
  );

  const resetCases: { label: string; stored: string | undefined }[] = [
    {
      label: "resetting stored settings restores the defaults",
      stored: serializeSettings(custom),
    },
    {
      label: "resetting an empty store writes the defaults",
      stored: undefined,
    },
  ];
  for (const item of resetCases) {
    if (item.stored === undefined) test.storage.delete(SETTINGS_KEY);
    else test.storage.set(SETTINGS_KEY, item.stored);

    const reported = await test.settings.resetIndexSettings();

    assert(
      reported &&
        test.storage.get(SETTINGS_KEY) ===
          serializeSettings(DEFAULT_SETTINGS) &&
        same(await test.settings.loadIndexSettings(), DEFAULT_SETTINGS),
      item.label,
    );
  }
}
