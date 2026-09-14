import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { rebuildIndex } from "../src/lib/index-build";
import { deleteIndexDatabase, openIndexForWrite } from "../src/lib/index-db";
import { closeIndexReader, searchIndex } from "../src/lib/index-reader";
import {
  normalizeRoots,
  scanRoot,
  scanRoots,
  spawnFdDefault,
} from "../src/lib/index-scan";
import { parseQuery } from "../src/lib/query";

type Assert = (ok: boolean, label: string) => void;

export async function indexSafetyChecks(assert: Assert) {
  const dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "fsbu-safety-")),
  );
  const file = path.join(dir, "index.sqlite");
  const roots = ["a", "b", "removed"].map((name) => path.join(dir, name));
  for (const root of roots) fs.mkdirSync(root);
  const openWriter = () => {
    const result = openIndexForWrite(file);
    if (result.kind !== "opened")
      throw new Error("Could not open fixture index");
    return result.db;
  };
  const seed = (db: DatabaseSync, root: string) => {
    db.prepare(
      `INSERT OR IGNORE INTO files
      (path, name, parent, root, is_dir, is_symlink, size, mtime_ms, birthtime_ms, scan_id)
      VALUES (?, 'saved.txt', ?, ?, 0, 0, 0, 0, 0, 0)`,
    ).run(path.join(root, "saved.txt"), root, root);
  };
  const hasSaved = (db: DatabaseSync, root: string) =>
    db
      .prepare("SELECT 1 FROM files WHERE path = ?")
      .get(path.join(root, "saved.txt")) !== undefined;

  try {
    assert(
      normalizeRoots(["/", "/Users/example", "/Applications"]).join() === "/",
      "filesystem root absorbs nested scopes without scanning them twice",
    );

    // A separate command can create the index without notifying this reader.
    assert(
      searchIndex(file, parseQuery("saved")).status === "missing",
      "an absent index is reported before creation",
    );
    const db = openWriter();
    try {
      seed(db, roots[0]);
      assert(
        searchIndex(file, parseQuery("saved")).entries.length === 1,
        "a reader retries after a previously missing index is created",
      );
      closeIndexReader();

      for (const point of [
        "before-start",
        "after-output",
        "after-metadata",
      ] as const) {
        seed(db, roots[0]);
        const controller = new AbortController();
        if (point === "before-start") controller.abort();
        const outcome = await scanRoot(
          roots[0],
          {
            fd: "/unused",
            roots,
            db,
            signal: controller.signal,
            spawnFd: async function* () {
              if (controller.signal.aborted) return;
              yield Buffer.from(`${roots[0]}/new.txt\0`);
              if (point === "after-output") controller.abort();
            },
            onProgress: () => {
              if (point === "after-metadata") controller.abort();
            },
          },
          Infinity,
        );
        assert(
          !outcome.complete && outcome.stopped === "cancelled",
          `cancellation ${point} cannot certify a complete root`,
        );
        assert(
          hasSaved(db, roots[0]),
          `cancellation ${point} preserves unseen saved paths`,
        );
      }

      // Cancel on the final ownership check of root A, before root B starts.
      for (const root of roots) seed(db, root);
      const controller = new AbortController();
      const report = await scanRoots({
        fd: "/unused",
        roots: roots.slice(0, 2),
        db,
        signal: controller.signal,
        spawnFd: async function* () {
          yield Buffer.alloc(0);
        },
        assertOwned: () => {
          controller.abort();
        },
      });
      assert(
        !report.complete,
        "a scan cannot complete while configured roots remain unvisited",
      );
      assert(
        hasSaved(db, roots[2]) && report.forgotten.length === 0,
        "cancelling between roots cannot remove coverage outside the new scope",
      );

      seed(db, roots[0]);
      const stalled = new AbortController();
      // A watchdog makes the pre-fix failure terminate; success comes from the
      // scan's own deadline, not an assertion about machine-dependent timing.
      const watchdog = setTimeout(() => stalled.abort(), 1000);
      try {
        const timed = await scanRoot(
          roots[0],
          {
            fd: "/unused",
            roots,
            db,
            signal: stalled.signal,
            spawnFd: async function* (_args, signal) {
              if (!signal?.aborted) {
                await new Promise<void>((resolve) =>
                  signal?.addEventListener("abort", () => resolve(), {
                    once: true,
                  }),
                );
              }
              yield Buffer.alloc(0);
            },
          },
          Date.now() + 30,
        );
        assert(
          timed.stopped === "time-limit" && !timed.complete,
          "the scan deadline stops a crawler that produces no further output",
        );
        assert(
          hasSaved(db, roots[0]),
          "a stalled crawler preserves previously indexed paths",
        );
      } finally {
        clearTimeout(watchdog);
      }
    } finally {
      db.close();
      closeIndexReader();
    }

    for (const code of [0, 1, 2]) {
      let failed = false;
      try {
        for await (const chunk of spawnFdDefault(process.execPath, [
          "-e",
          `process.exit(${code})`,
        ])) {
          // Exercise the real child process exit handling without requiring fd.
          void chunk;
        }
      } catch {
        failed = true;
      }
      assert(
        failed === (code !== 0),
        `crawler exit ${code} is classified correctly`,
      );
    }
    let diagnosticFailure = false;
    try {
      for await (const chunk of spawnFdDefault(process.execPath, [
        "-e",
        "process.stderr.write('Permission denied: unreadable folder\\n')",
      ])) {
        // fd can report a traversal error while still exiting zero.
        void chunk;
      }
    } catch {
      diagnosticFailure = true;
    }
    assert(
      diagnosticFailure,
      "crawler filesystem diagnostics prevent authoritative stale removal",
    );

    const broken = await rebuildIndex({
      file,
      roots: [roots[0]],
      withLock: (work) => work(() => {}),
      lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
      spawnFd: async function* () {
        yield Buffer.from(`${roots[0]}/new.txt\0`);
      },
      onFinishing: () => {
        const other = new DatabaseSync(file);
        try {
          other.exec("DROP TABLE files_fts");
        } finally {
          other.close();
        }
      },
    });
    assert(
      broken.kind === "failed" && /files_fts/i.test(broken.message),
      "FTS finalization failure is reported instead of claiming a successful rebuild",
    );
    const repaired = openWriter();
    repaired.close();
    assert(
      searchIndex(file, parseQuery("new")).entries.length === 1,
      "the next writer can recover and search a failed finalization",
    );
    closeIndexReader();

    // An unexpected directory at the database path must never be recursively
    // removed, or counted as successfully deleted. Works without chmod tricks.
    const blocked = path.join(dir, "blocked.sqlite");
    fs.mkdirSync(blocked);
    let deletionError: unknown;
    try {
      deleteIndexDatabase(blocked);
    } catch (error) {
      deletionError = error;
    }
    assert(
      deletionError instanceof Error,
      "index deletion propagates removal failures",
    );
    assert(
      fs.statSync(blocked).isDirectory(),
      "failed deletion leaves unexpected directories intact",
    );
  } finally {
    closeIndexReader();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
