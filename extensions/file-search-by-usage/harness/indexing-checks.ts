import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { buildSync, transformSync } from "esbuild";
import type { ShortcutIndex } from "../src/lib/drive-shortcuts";
import type { SharedIndex } from "../src/lib/shared-scan";
import type { RecentScan } from "../src/lib/recent-files";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Loads real command/storage code while replacing Raycast and slow Drive scans. */
function loadCommand(supportPath: string) {
  const storage = new Map<string, string>();
  const caches = new Map<string, Map<string, string>>();
  const shared: SharedIndex = {
    paths: ["/foo/bar"],
    scannedAt: 1,
    available: true,
    partial: false,
  };
  const clearing = { before: async () => {} };
  const writing: { before: (key: string) => Promise<void> } = {
    before: async () => {},
  };
  const reading: { before: (key: string) => Promise<void> } = {
    before: async () => {},
  };
  const scans: ((index: ShortcutIndex) => void)[] = [];
  const failures: ((error: Error) => void)[] = [];
  const recentScans: ((result: RecentScan) => void)[] = [];
  const scanOptions: {
    recent: Parameters<
      typeof import("../src/lib/recent-files").scanRecentFiles
    >[0][];
    shortcuts: Parameters<
      typeof import("../src/lib/drive-shortcuts").scanShortcuts
    >[0][];
    shared: Parameters<
      typeof import("../src/lib/shared-scan").scanSharedFolders
    >[0][];
  } = { recent: [], shortcuts: [], shared: [] };
  const confirmation = { accepted: true };
  const cacheWriting = { fail: false };
  const toasts: { title: string; message?: string; style: string }[] = [];
  const api = {
    environment: { supportPath, launchType: "user" },
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
      if (id.endsWith("/recent-files"))
        return {
          scanRecentFiles: (options: (typeof scanOptions.recent)[number]) => {
            scanOptions.recent.push(options);
            return new Promise<RecentScan>((resolve) =>
              recentScans.push(resolve),
            );
          },
        };
      if (id.endsWith("/drive-shortcuts"))
        return {
          scanShortcuts: (options: (typeof scanOptions.shortcuts)[number]) => {
            scanOptions.shortcuts.push(options);
            return new Promise<ShortcutIndex>((resolve, reject) => {
              scans.push(resolve);
              failures.push(reject);
            });
          },
        };
      if (id.endsWith("/shared-scan"))
        return {
          scanSharedFolders: async (
            options: (typeof scanOptions.shared)[number],
          ) => {
            scanOptions.shared.push(options);
            return shared;
          },
        };
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
    load(path.resolve("src/index-shortcuts.tsx")) as {
      default: () => Promise<void>;
    }
  ).default;
  const deleteCommand = (
    load(path.resolve("src/delete-data.tsx")) as {
      default: () => Promise<void>;
    }
  ).default;
  const recents = load(
    path.resolve("src/lib/recent-setup.ts"),
  ) as typeof import("../src/lib/recent-setup");
  const recentCommand = (
    load(path.resolve("src/populate-recents.tsx")) as {
      default: () => Promise<void>;
    }
  ).default;
  return {
    sharedIndex: load(
      path.resolve("src/lib/shared-index.ts"),
    ) as typeof import("../src/lib/shared-index"),
    access: load(
      path.resolve("src/lib/storage-lock.ts"),
    ) as typeof import("../src/lib/storage-lock"),
    discovered: load(
      path.resolve("src/lib/discovered.ts"),
    ) as typeof import("../src/lib/discovered"),
    usage: load(
      path.resolve("src/lib/usage-cache.ts"),
    ) as typeof import("../src/lib/usage-cache"),
    store: load(
      path.resolve("src/lib/store.ts"),
    ) as typeof import("../src/lib/store"),
    writing,
    reading,
    command,
    deleteCommand,
    storage,
    caches,
    shared,
    clearing,
    scans,
    failures,
    toasts,
    recents,
    recentScans,
    scanOptions,
    recentCommand,
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
    await mutation.discovered.rememberDiscovered(["/foo/old.txt"], generation);
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
    for (let i = 0; i < 100 && test.scans.length === 0; i++) await flush();
    const second = test.command();
    // Let the second command either acquire the lock or report contention.
    for (let i = 0; i < 100; i++) await flush();
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
    const good: ShortcutIndex = {
      shortcuts: [{ path: "/foo", name: "foo", target: "/bar" }],
      scannedAt: 1,
      available: true,
      partial: false,
    };
    const setup = loadCommand(path.join(root, "recent-setup"));
    setup.confirmation.accepted = false;
    await setup.recentCommand();
    assert(
      setup.recentScans.length === 0 && setup.storage.size === 0,
      "declining recent-file consent neither scans nor writes a setup choice",
    );
    setup.confirmation.accepted = true;
    assert(
      await setup.recents.needsRecentSetup(),
      "first use offers recent-file setup",
    );
    await setup.recents.skipRecentSetup();
    assert(
      !(await setup.recents.needsRecentSetup()) &&
        setup.recentScans.length === 0,
      "skipping setup persists the choice without scanning",
    );
    const importing = setup.recents.populateRecentFiles();
    await flush();
    setup.toasts.length = 0;
    await setup.deleteCommand();
    assert(
      !setup.toasts.some((t) => t.title === "Deleted everything"),
      "deletion cannot succeed while recent-file import is active",
    );
    setup.recentScans[0]?.({
      entries: [
        {
          path: "/foo/bar.txt",
          name: "bar.txt",
          isDirectory: false,
          size: 1,
          mtimeMs: 1,
          birthtimeMs: 1,
          recent: true,
        },
      ],
      partial: false,
    });
    await importing;
    assert(
      setup.recents.loadRecentEntries().length === 1 &&
        !setup.storage.has("visits"),
      "recent import saves its cache without changing recorded opens",
    );
    assert(
      !(await setup.recents.needsRecentSetup()),
      "successful import dismisses first-run setup",
    );
    await setup.deleteCommand();
    assert(
      setup.recents.loadRecentEntries().length === 0 &&
        (await setup.recents.needsRecentSetup()),
      "deletion clears recent-file data and restores optional setup without importing automatically",
    );
    setup.caches.get("recent-files")!.set(
      "entries",
      JSON.stringify([
        {
          path: "/foo/bar.txt",
          name: "bar.txt",
          isDirectory: false,
          size: 1,
          mtimeMs: 1,
          birthtimeMs: 1,
          lastUsedMs: "bad-date",
        },
      ]),
    );
    assert(
      setup.recents.loadRecentEntries().length === 0,
      "malformed imported metadata cannot enter the ranking pipeline",
    );
    setup.recents.clearRecentEntries();
    setup.storage.set("recent-files-setup", "partial");
    assert(
      await setup.recents.needsRecentSetup(),
      "partial recent import remains available to retry during setup",
    );
    const combined = loadCommand(path.join(root, "combined-setup"));
    assert(
      Boolean(combined.setup),
      "first-run setup includes a Google Drive step",
    );
    if (combined.setup) {
      const initialState = await combined.setup.loadSearchSetup();
      assert(
        initialState.recents && initialState.drive,
        "first use offers both setup steps",
      );
      const stages: string[] = [];
      const messages: string[] = [];
      const run = combined.setup.runSearchSetup({
        onStage: (stage) => stages.push(stage),
        onStatus: (message) => messages.push(message),
      });
      await flush();
      assert(
        combined.scanOptions.recent[0]?.budgetMs === 60_000 &&
          combined.scanOptions.recent[0]?.metadataBudgetMs === 15_000,
        "first-run setup gives recent scanning and metadata longer budgets",
      );
      const limits = combined.scanOptions.recent[0];
      assert(
        limits?.maxDocuments === 500 &&
          limits.maxFolders === 50 &&
          limits.maxPerFolder === 500 &&
          limits.maxEntries === 10_000,
        "first-run setup requests 500 documents, 50 parents, 500 neighbors, and 10000 total entries",
      );
      await new Promise((resolve) => setTimeout(resolve, 1100));
      assert(
        messages.some((message) => /1s elapsed/.test(message)),
        "setup publishes elapsed progress even while the provider has not returned",
      );
      assert(
        combined.scans.length === 0,
        "Drive indexing waits for recent import to finish",
      );
      await combined.deleteCommand();
      assert(
        !combined.toasts.some((t) => t.title === "Deleted everything"),
        "combined setup excludes deletion",
      );
      combined.recentScans[0]({ entries: [], partial: false });
      await flush();
      assert(
        combined.scanOptions.shortcuts[0]?.budgetMs === 600_000,
        "first-run setup allows ten minutes for the shortcut scan",
      );
      combined.scans[0](good);
      await run;
      assert(
        combined.scanOptions.shared[0]?.budgetMs === 600_000 &&
          messages.some((message) => /shared.folder/i.test(message)),
        "setup announces the shared-folder phase and gives it ten minutes",
      );
      const messageCount = messages.length;
      await new Promise((resolve) => setTimeout(resolve, 1100));
      assert(
        messages.length === messageCount,
        "finished setup stops its progress timer",
      );
      const finished = await combined.setup.loadSearchSetup();
      assert(
        !finished.recents &&
          !finished.drive &&
          stages.join(",") === "recents,drive",
        "completed setup saves both choices in order",
      );
      const scansBefore = combined.scans.length;
      await combined.setup.runSearchSetup();
      assert(
        combined.scans.length === scansBefore,
        "completed setup does not scan again",
      );
      await combined.deleteCommand();
      assert(
        (await combined.setup.loadSearchSetup()).drive,
        "deletion restores the Google Drive setup step",
      );
      await combined.setup.skipSearchSetup("recents");
      const onlyDrive = await combined.setup.loadSearchSetup();
      assert(
        !onlyDrive.recents && onlyDrive.drive,
        "skipping recents leaves Drive available",
      );
      const partial = combined.setup.runSearchSetup();
      await flush();
      combined.scans[1]({
        ...good,
        partial: true,
        partialReason: "time-limit",
      });
      await partial;
      assert(
        combined.toasts.at(-1)?.message?.includes("time limit") === true,
        "the final setup message retains the actual Drive stopping reason",
      );
      assert(
        (await combined.setup.loadSearchSetup()).drive,
        "partial Drive indexing remains available to retry",
      );
      const cancelled = new AbortController();
      const retry = combined.setup.runSearchSetup({ signal: cancelled.signal });
      await flush();
      cancelled.abort();
      combined.scans[2](good);
      await retry;
      assert(
        (await combined.setup.loadSearchSetup()).drive,
        "cancelled setup cannot mark Drive complete",
      );
      await combined.setup.skipSearchSetup("drive");
      assert(
        !(await combined.setup.loadSearchSetup()).drive,
        "Drive can be skipped independently",
      );
      const generation = combined.access.dataGeneration();
      await combined.deleteCommand();
      await combined.setup.runSearchSetup({ generation });
      assert(
        combined.scans.length === 3 && combined.recentScans.length === 1,
        "pre-deletion setup cannot restart scans or recreate choices",
      );
      await combined.setup.skipSearchSetup("recents");
      combined.cacheWriting.fail = true;
      const cannotSave = combined.setup.runSearchSetup();
      await flush();
      combined.scans[3](good);
      await cannotSave;
      assert(
        (await combined.setup.loadSearchSetup()).drive,
        "a complete Drive scan whose cache cannot be saved remains retryable",
      );
      combined.cacheWriting.fail = false;
      const unavailable = combined.setup.runSearchSetup();
      await flush();
      combined.scans[4]({ ...good, available: false, shortcuts: [] });
      await unavailable;
      assert(
        /unavailable/i.test(combined.toasts.at(-1)?.message ?? ""),
        "the final setup summary preserves an unavailable Drive diagnosis",
      );
      assert(
        (await combined.setup.loadSearchSetup()).drive,
        "an unavailable Google Drive cannot complete setup",
      );
      await combined.deleteCommand();
      const stopRecents = new AbortController();
      const stopRun = combined.setup.runSearchSetup({
        signal: stopRecents.signal,
      });
      await flush();
      stopRecents.abort();
      combined.recentScans[1]({ entries: [], partial: true, cancelled: true });
      await stopRun;
      assert(
        combined.scans.length === 5 &&
          (await combined.setup.loadSearchSetup()).recents,
        "stopping recent import leaves both steps retryable and never starts Drive indexing",
      );
      await combined.setup.skipSearchSetup("drive");
      const recentOnly = await combined.setup.loadSearchSetup();
      assert(
        recentOnly.recents && !recentOnly.drive,
        "skipping Drive leaves recent-file setup available",
      );
      const partialRecent = combined.setup.runSearchSetup();
      await flush();
      combined.recentScans[2]({ entries: [], partial: true });
      await partialRecent;
      assert(
        combined.toasts.some(
          (toast) => toast.title === "Search setup incomplete",
        ),
        "setup reports an incomplete recent-file step even when Drive is skipped",
      );
    }
    const prompt = loadCommand(path.join(root, "setup-prompt"));
    assert(
      (await prompt.setup!.loadSearchSetup()).hasRun === false,
      "opening setup state without running a scan keeps the main prompt available",
    );
    prompt.confirmation.accepted = false;
    const consent = await prompt.setup!.confirmSearchSetup(
      await prompt.setup!.loadSearchSetup(),
    );
    assert(
      !consent && (await prompt.setup!.loadSearchSetup()).hasRun === false,
      "cancelling setup confirmation does not dismiss the main prompt",
    );
    prompt.confirmation.accepted = true;
    const beforeStart = new AbortController();
    beforeStart.abort();
    await prompt.setup!.runSearchSetup({ signal: beforeStart.signal });
    assert(
      (await prompt.setup!.loadSearchSetup()).hasRun === false,
      "a setup request cancelled before starting does not dismiss the main prompt",
    );
    await prompt.setup!.skipSearchSetup("recents");
    await prompt.setup!.skipSearchSetup("drive");
    assert(
      (await prompt.setup!.loadSearchSetup()).hasRun === false,
      "skipping sources is not recorded as having run setup",
    );
    const rerun = prompt.setup!.runSearchSetup({ rerun: true });
    await flush();
    assert(
      prompt.recentScans.length === 1,
      "setup in Actions can explicitly run again after both sources were skipped or completed",
    );
    prompt.recentScans[0]?.({ entries: [], partial: true });
    await flush();
    prompt.scans[0]?.({ ...good, partial: true, partialReason: "time-limit" });
    await rerun;
    const ranPartial = await prompt.setup!.loadSearchSetup();
    assert(
      ranPartial.hasRun === true && ranPartial.recents && ranPartial.drive,
      "a partial setup remains retryable without restoring the main prompt",
    );
    await prompt.deleteCommand();
    assert(
      (await prompt.setup!.loadSearchSetup()).hasRun === false,
      "deleting extension data resets the one-time setup prompt",
    );
    const stoppedPrompt = new AbortController();
    const stoppedSetup = prompt.setup!.runSearchSetup({
      signal: stoppedPrompt.signal,
    });
    await flush();
    stoppedPrompt.abort();
    prompt.recentScans.at(-1)?.({
      entries: [],
      partial: true,
      cancelled: true,
    });
    await stoppedSetup;
    assert(
      (await prompt.setup!.loadSearchSetup()).hasRun === true,
      "stopping a scan after it starts still dismisses the main prompt on later visits",
    );
    const legacyPrompt = loadCommand(path.join(root, "legacy-setup-prompt"));
    legacyPrompt.storage.set("recent-files-setup", "partial");
    assert(
      (await legacyPrompt.setup!.loadSearchSetup()).hasRun === true,
      "an earlier partial setup is recognized without asking existing users to run it again",
    );
    await legacyPrompt.setup!.skipSearchSetup("recents");
    await legacyPrompt.setup!.skipSearchSetup("drive");
    assert(
      (await legacyPrompt.setup!.loadSearchSetup()).hasRun === true,
      "skipping unfinished legacy steps cannot bring back the main setup prompt",
    );

    const startupPrompt = loadCommand(path.join(root, "startup-setup-prompt"));
    const startupController = new AbortController();
    let releaseSetupRead = () => {};
    let startedSetupRead = () => {};
    const setupReadStarted = new Promise<void>((resolve) => {
      startedSetupRead = resolve;
    });
    const setupReadBlocked = new Promise<void>((resolve) => {
      releaseSetupRead = resolve;
    });
    startupPrompt.reading.before = async (key) => {
      if (key === "recent-files-setup") {
        startedSetupRead();
        await setupReadBlocked;
      }
    };
    const stoppedBeforeWork = startupPrompt.setup!.runSearchSetup({
      signal: startupController.signal,
    });
    await setupReadStarted;
    startupController.abort();
    releaseSetupRead();
    await stoppedBeforeWork;
    startupPrompt.reading.before = async () => {};
    assert(
      (await startupPrompt.setup!.loadSearchSetup()).hasRun === false &&
        startupPrompt.recentScans.length === 0,
      "stopping during startup before any scan begins keeps the main prompt available",
    );

    const busyPrompt = loadCommand(path.join(root, "busy-setup-prompt"));
    const holdingIndex = busyPrompt.command();
    await flush();
    await busyPrompt.setup!.runSearchSetup();
    assert(
      (await busyPrompt.setup!.loadSearchSetup()).hasRun === false &&
        busyPrompt.recentScans.length === 0,
      "a busy indexing lock cannot dismiss the prompt without running setup",
    );
    busyPrompt.scans[0](good);
    await holdingIndex;

    const largerCache = loadCommand(path.join(root, "larger-recent-cache"));
    await largerCache.setup!.skipSearchSetup("drive");
    const largeImport = largerCache.setup!.runSearchSetup();
    await flush();
    const longParent = "/foo/" + "bar/".repeat(125);
    const cachedRows: RecentScan["entries"] = Array.from(
      { length: 10_000 },
      (_, i) => ({
        path: longParent + "baz-" + i + ".txt",
        storagePath: longParent + "baz-" + i + ".txt",
        name: "baz-" + i + ".txt",
        isDirectory: false,
        size: 1,
        mtimeMs: 1,
        birthtimeMs: 1,
      }),
    );
    largerCache.recentScans[0]({ entries: cachedRows, partial: false });
    await largeImport;
    const reloaded = largerCache.recents.loadRecentEntries();
    assert(
      reloaded.length === 10_000 &&
        reloaded[9999]?.path.endsWith("/baz-9999.txt"),
      "all 10000 recent entries survive saving and reloading even with long cloud paths",
    );
    const standaloneImport = largerCache.recents.populateRecentFiles();
    await flush();
    const small = {
      ...cachedRows[0],
      path: "/foo/new.txt",
      storagePath: "/foo/new.txt",
      name: "new.txt",
    };
    largerCache.recentScans[1]({ entries: [small], partial: false });
    await standaloneImport;
    const mergedCache = largerCache.recents.loadRecentEntries();
    assert(
      mergedCache.length === 10_000 &&
        mergedCache[0]?.path === "/foo/new.txt" &&
        mergedCache.some((entry) => entry.path.endsWith("/baz-9000.txt")),
      "a smaller later import retains the larger cache without exceeding 10000 entries",
    );
    const standaloneLimits = largerCache.scanOptions.recent[1];
    assert(
      standaloneLimits?.maxDocuments === undefined &&
        standaloneLimits?.maxEntries === undefined,
      "standalone recent scans keep their existing collection defaults",
    );
    largerCache.caches
      .get("recent-files")!
      .set("entries", JSON.stringify([...cachedRows, small]));
    assert(
      largerCache.recents.loadRecentEntries().length === 10_000,
      "loading an oversized stored recent cache still enforces the 10000-entry ceiling",
    );
    largerCache.storage.delete("recent-files-setup");
    const preserved = largerCache.recents.loadRecentEntries()[0]?.path;
    const tooLarge = largerCache.setup!.runSearchSetup();
    await flush();
    const oversizedParent = "/foo/" + "bar/".repeat(300);
    largerCache.recentScans[2]({
      entries: cachedRows.map((entry, i) => ({
        ...entry,
        path: oversizedParent + i + ".txt",
        storagePath: oversizedParent + i + ".txt",
      })),
      partial: false,
    });
    await tooLarge;
    assert(
      largerCache.recents.loadRecentEntries()[0]?.path === preserved &&
        (await largerCache.setup!.loadSearchSetup()).recents,
      "a cache exceeding its byte allowance preserves previous results and cannot complete setup",
    );
    const sharedCapacity = loadCommand(path.join(root, "shared-capacity"));
    const savedShared = { ...sharedCapacity.shared, paths: ["/previous"] };
    sharedCapacity.sharedIndex.saveSharedIndex(savedShared);
    // Below the limit in JS characters, above it in UTF-8 bytes.
    const oversizedShared = {
      ...savedShared,
      paths: Array.from(
        { length: 40_000 },
        (_, i) => "/cloud/" + "é".repeat(110) + i,
      ),
    };
    assert(
      !sharedCapacity.sharedIndex.saveSharedIndex(oversizedShared),
      "an oversized UTF-8 shared index reports a failed save",
    );
    assert(
      sharedCapacity.sharedIndex.loadSharedIndex().paths[0] === "/previous",
      "an oversized shared index cannot evict the previous saved index",
    );
    Object.assign(sharedCapacity.shared, oversizedShared);
    const oversizedRefresh = sharedCapacity.command();
    await flush();
    sharedCapacity.scans[0](good);
    await oversizedRefresh;
    assert(
      sharedCapacity.toasts.at(-1)?.style === "failure" &&
        !sharedCapacity.storage.has("google-drive-setup"),
      "an oversized shared index cannot report indexing success or complete setup",
    );
    const boundaryShared = { ...savedShared, paths: [""] };
    const overhead = Buffer.byteLength(JSON.stringify(boundaryShared), "utf8");
    boundaryShared.paths[0] = "a".repeat(8_000_000 - overhead);
    assert(
      sharedCapacity.sharedIndex.saveSharedIndex(boundaryShared) &&
        sharedCapacity.sharedIndex.loadSharedIndex().paths[0] ===
          boundaryShared.paths[0],
      "a shared index exactly at the byte limit is saved and readable",
    );
    assert(
      sharedCapacity.sharedIndex.saveSharedIndex(savedShared) &&
        sharedCapacity.sharedIndex.loadSharedIndex().paths[0] === "/previous",
      "a smaller shared index can still replace a full cache",
    );

    for (const reason of ["time-limit", "depth-limit", "item-limit"] as const) {
      const bounded = loadCommand(path.join(root, reason));
      bounded.storage.set("shortcuts", JSON.stringify(good));
      bounded.caches.get("shared-folders")!.set(
        "index",
        JSON.stringify({
          paths: ["/foo/bar", "/foo/baz"],
          scannedAt: 1,
          available: true,
          partial: false,
        }),
      );
      Object.assign(bounded.shared, {
        paths: ["/foo/bar"],
        scannedAt: 2,
        partial: true,
        partialReason: reason,
      });
      const refresh = bounded.command();
      await flush();
      bounded.scans[0]({
        ...good,
        shortcuts: [],
        scannedAt: 2,
        partial: true,
        partialReason: reason,
      });
      await refresh;
      assert(
        JSON.parse(bounded.storage.get("shortcuts")!).shortcuts.length === 1,
        `${reason} refresh preserves a complete shortcut index`,
      );
      assert(
        JSON.parse(bounded.caches.get("shared-folders")!.get("index")!).paths
          .length === 2,
        `${reason} refresh preserves a complete shared-folder index`,
      );
      assert(
        bounded.toasts.some((t) => /kept/i.test(t.message ?? "")),
        `${reason} refresh explains that saved indexes were kept`,
      );
    }

    const evolving = loadCommand(path.join(root, "evolving"));
    const initial = evolving.command();
    await flush();
    Object.assign(evolving.shared, {
      partial: true,
      partialReason: "time-limit",
    });
    evolving.scans[0]({ ...good, partial: true, partialReason: "time-limit" });
    await initial;
    assert(
      JSON.parse(evolving.storage.get("shortcuts")!).shortcuts.length === 1,
      "a first partial scan provides searchable shortcuts",
    );
    assert(
      JSON.parse(evolving.caches.get("shared-folders")!.get("index")!).paths
        .length === 1,
      "a first partial scan provides searchable shared-folder paths",
    );
    const improved = evolving.command();
    await flush();
    evolving.shared.paths = ["/foo/bar", "/foo/baz"];
    evolving.scans[1]({
      ...good,
      shortcuts: [
        ...good.shortcuts,
        { path: "/baz", name: "baz", target: "/bar" },
      ],
      partial: true,
    });
    await improved;
    assert(
      JSON.parse(evolving.storage.get("shortcuts")!).shortcuts.length === 2 &&
        JSON.parse(evolving.caches.get("shared-folders")!.get("index")!).paths
          .length === 2,
      "a later partial scan can refresh an already partial index",
    );
    const complete = evolving.command();
    await flush();
    Object.assign(evolving.shared, { paths: [], partial: false });
    evolving.scans[2]({ ...good, shortcuts: [] });
    await complete;
    assert(
      JSON.parse(evolving.storage.get("shortcuts")!).shortcuts.length === 0 &&
        JSON.parse(evolving.caches.get("shared-folders")!.get("index")!).paths
          .length === 0,
      "a complete empty scan removes stale paths from previous partial indexes",
    );

    const deletion = loadCommand(path.join(root, "deletion"));
    deletion.storage.set("pins", JSON.stringify(["/foo"]));
    const activeScan = deletion.command();
    await flush();
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
    await flush();
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
    // Without exclusion, a later scan completes before the older unavailable run.
    if (test.scans.length > 1) {
      test.scans[1](good);
      await second;
      test.scans[0]({
        shortcuts: [],
        scannedAt: 2,
        available: false,
        partial: false,
      });
    } else {
      test.scans[0](good);
    }
    await Promise.all([first, second]);
    const saved = JSON.parse(test.storage.get("shortcuts") ?? "{}");
    assert(
      saved.shortcuts?.length === 1,
      "an overlapping unavailable run cannot erase the saved index",
    );
    assert(
      test.toasts.some(
        (toast) =>
          toast.style === "failure" &&
          /Wait for indexing/.test(toast.message ?? ""),
      ),
      "a duplicate request explains that it must wait for indexing or deletion",
    );

    const failed = test.command();
    await flush();
    test.failures.at(-1)!(new Error("Synthetic scan failure"));
    await failed;
    assert(
      !fs.existsSync(path.join(root, "google-drive-indexing.lock")),
      "a scan exception releases the indexing lock",
    );
    assert(
      JSON.parse(test.storage.get("shortcuts")!).shortcuts.length === 1,
      "a scan exception preserves the saved index",
    );

    const replacementTest = loadCommand(path.join(root, "replacement"));
    const superseded = replacementTest.command();
    await flush();
    const lock = path.join(root, "replacement", "google-drive-indexing.lock");
    fs.renameSync(lock, `${lock}.old`);
    fs.mkdirSync(lock);
    replacementTest.scans[0](good);
    await superseded;
    assert(
      !replacementTest.storage.has("shortcuts"),
      "a run that lost lock ownership cannot save an index",
    );
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
    await flush();
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
      await flush();
      const acquired = unknown.scans.length > 0;
      unknown.scans[0]?.(good);
      await attempted;
      assert(
        !acquired && fs.existsSync(unknownLock),
        `stale ${metadata} ownership metadata cannot prove a writer is dead`,
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
