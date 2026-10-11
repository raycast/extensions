import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findFd } from "../src/lib/fd";
import { openIndexForWrite } from "../src/lib/index-db";
import { scanRoots, spawnFdDefault } from "../src/lib/index-scan";
import { queryIndex } from "../src/lib/db-search";
import { parseQuery } from "../src/lib/query";

/** Real fd and SQLite: an explicit nested scope survives its parent's exclusions. */
export async function scopeExceptionChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const fd = findFd();
  if (fd.kind !== "found") return;
  const temp = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "scope-exception-")),
  );
  const home = path.join(temp, "home");
  // Brackets must be escaped in the parent's fd exclusion, not treated as a glob.
  const cloud = path.join(home, "Library", "CloudStorage", "Provider[Work]");
  const report = path.join(cloud, "Invited Example Collaborator", "report.txt");
  const local = path.join(home, "Documents", "report.txt");
  const noise = path.join(home, "Library", "Other", "report.txt");
  for (const file of [report, local, noise]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "r");
  }
  const opened = openIndexForWrite(path.join(temp, "index.sqlite"));
  if (opened.kind !== "opened") throw new Error("Could not create test index");
  const db = opened.db;
  const has = (file: string) =>
    !!db.prepare("SELECT 1 FROM files WHERE path = ?").get(file);
  try {
    // Start with the old layout, where all cloud paths belong to the home root.
    await scanRoots({ fd: fd.path, roots: [home], db });
    const interrupted = await scanRoots({
      fd: fd.path,
      roots: [home, cloud],
      db,
      patterns: ["**/Library/**"],
      spawnFd: async function* (args, signal) {
        if (args.at(-1) === cloud)
          throw new Error("Synthetic unavailable provider");
        yield* spawnFdDefault(fd.path, args, signal);
      },
    });
    assert(
      !interrupted.complete && has(report),
      "a successful parent scan preserves old cloud coverage when the new nested scope fails",
    );

    const completed = await scanRoots({
      fd: fd.path,
      roots: [home, cloud],
      db,
      patterns: ["**/Library/**"],
    });
    assert(
      completed.complete &&
        completed.roots.length === 2 &&
        has(report) &&
        has(local) &&
        !has(noise),
      "explicit cloud scope is indexed while the rest of Library is excluded",
    );
    assert(
      has(cloud) &&
        queryIndex(db, parseQuery("collaborator")).entries.some(
          (e) => e.path === path.dirname(report),
        ),
      "the nested scope itself and its named folders are searchable",
    );

    fs.symlinkSync(cloud, path.join(home, "Cloud Shortcut"));
    const libraryAlias = path.join(home, "Library Shortcut");
    fs.symlinkSync(path.join(home, "Library"), libraryAlias);
    let emitted = "";
    const unfiltered = await scanRoots({
      fd: fd.path,
      roots: [home, cloud],
      db,
      spawnFd: async function* (args, signal) {
        for await (const chunk of spawnFdDefault(fd.path, args, signal)) {
          emitted += chunk.toString("utf8");
          yield chunk;
        }
      },
    });
    assert(
      unfiltered.complete &&
        emitted.split("\0").filter((p) => p === report).length === 1 &&
        !has(
          path.join(
            home,
            "Cloud Shortcut",
            "Invited Example Collaborator",
            "report.txt",
          ),
        ),
      "nested scopes and their parent-level aliases are not crawled twice",
    );
    assert(
      !has(
        path.join(
          libraryAlias,
          path.relative(path.join(home, "Library"), report),
        ),
      ) && has(path.join(libraryAlias, "Other", "report.txt")),
      "ancestor aliases skip independently scanned children but retain unrelated contents",
    );
    fs.unlinkSync(libraryAlias);
    assert(
      (
        db.prepare("SELECT root FROM files WHERE path = ?").get(report) as {
          root: string;
        }
      )?.root === cloud,
      "nested scope owns its files even when the parent has no ignore patterns",
    );

    // A deleted file still owned by an older parent must be collected by its new scope.
    db.prepare("UPDATE files SET root = ? WHERE path = ?").run(home, report);
    fs.unlinkSync(report);
    const removed = await scanRoots({
      fd: fd.path,
      roots: [home, cloud],
      db,
      patterns: ["**/Library/**"],
    });
    assert(
      removed.complete && !has(report),
      "a completed nested scan removes stale files inherited from an older parent scope",
    );

    fs.writeFileSync(report, "r");
    await scanRoots({ fd: fd.path, roots: [home, cloud], db });
    const collapsed = await scanRoots({
      fd: fd.path,
      roots: [home],
      db,
      patterns: ["**/Library/**"],
    });
    assert(
      collapsed.complete && !has(report) && has(local),
      "removing the explicit cloud scope lets the Library exclusion apply again",
    );
  } finally {
    db.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
