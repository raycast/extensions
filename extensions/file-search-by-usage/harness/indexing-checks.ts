import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { transformSync } from "esbuild";
import type { ShortcutIndex } from "../src/lib/drive-shortcuts";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Loads real command/storage code while replacing Raycast and slow Drive scans. */
function loadCommand(supportPath: string) {
  const storage = new Map<string, string>();
  const cache = new Map<string, string>();
  const scans: ((index: ShortcutIndex) => void)[] = [];
  const failures: ((error: Error) => void)[] = [];
  const toasts: { title: string; message?: string; style: string }[] = [];
  const api = {
    environment: { supportPath, launchType: "user" },
    LaunchType: { UserInitiated: "user" },
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
    },
    Cache: class {
      get(key: string) {
        return cache.get(key);
      }
      set(key: string, value: string) {
        cache.set(key, value);
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
          scanSharedFolders: async () => ({
            paths: ["/foo/bar"],
            scannedAt: 1,
            available: true,
            partial: false,
          }),
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
  return { command, storage, scans, failures, toasts };
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
        (toast) => toast.title === "Google Drive indexing is already running",
      ),
      "a duplicate request explains that indexing is already running",
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
