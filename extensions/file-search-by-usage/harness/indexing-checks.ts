import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { transformSync } from "esbuild";
import type { ShortcutIndex } from "../src/lib/drive-shortcuts";
import type { SharedIndex } from "../src/lib/shared-scan";

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
  const scans: ((index: ShortcutIndex) => void)[] = [];
  const failures: ((error: Error) => void)[] = [];
  const toasts: { title: string; message?: string; style: string }[] = [];
  const api = {
    environment: { supportPath, launchType: "user" },
    LaunchType: { UserInitiated: "user" },
    Alert: { ActionStyle: { Destructive: "destructive" } },
    confirmAlert: async () => true,
    Toast: {
      Style: { Animated: "animated", Failure: "failure", Success: "success" },
    },
    showToast: async (options: (typeof toasts)[number]) => {
      toasts.push(options);
      return options;
    },
    LocalStorage: {
      getItem: async (key: string) => storage.get(key),
      setItem: async (key: string, value: string) => {
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
      constructor({ namespace }: { namespace: string }) {
        if (!caches.has(namespace)) caches.set(namespace, new Map());
        this.cache = caches.get(namespace)!;
      }
      get(key: string) {
        return this.cache.get(key);
      }
      set(key: string, value: string) {
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
      if (id.endsWith("/drive-shortcuts"))
        return {
          scanShortcuts: () =>
            new Promise<ShortcutIndex>((resolve, reject) => {
              scans.push(resolve);
              failures.push(reject);
            }),
        };
      if (id.endsWith("/shared-scan"))
        return {
          scanSharedFolders: async () => shared,
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
  return {
    command,
    deleteCommand,
    storage,
    caches,
    shared,
    clearing,
    scans,
    failures,
    toasts,
  };
}

export async function indexingChecks(
  assert: (condition: boolean, label: string) => void,
) {
  console.log("\n=== overlapping indexing ===");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "search-indexing-"));
  try {
    const test = loadCommand(root);
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
    deletion.clearing.before = () =>
      new Promise<void>((resolve) => {
        finishClear = resolve;
      });
    const activeDelete = deletion.deleteCommand();
    await flush();
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
    const exitCode = transformSync(
      fs.readFileSync("src/lib/indexing-lock.ts", "utf8"),
      { loader: "ts", format: "cjs" },
    ).code;
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
    fs.mkdirSync(staleLock, { recursive: true });
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
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
