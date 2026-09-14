import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { compareNames } from "../src/lib/name-order";
import { MAX_ENTRIES, readDirectory, statEntry } from "../src/lib/read-dir";
import { Entry } from "../src/lib/types";
import {
  DirectorySnapshot,
  observeDirectory,
  readDirectoryAsync,
  statEntryAsync,
} from "../src/lib/directory-listing";
import { readUsageMetaResult } from "../src/lib/spotlight";
import { spawnFdDefault } from "../src/lib/index-scan";
import { deriveProgress } from "../src/lib/progress";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(predicate: () => boolean): Promise<boolean> {
  const deadline = Date.now() + 3000;
  while (!predicate() && Date.now() < deadline) await pause(10);
  return predicate();
}

export async function performanceChecks(
  assert: (condition: boolean, label: string) => void,
) {
  console.log("\n=== performance and freshness ===");
  const names = [
    "foo 1",
    "foo 10",
    "foo 2",
    "Foo",
    "foo",
    "fóo",
    "fo\u0301o",
    ".foo",
    "bar-baz",
    "bar_baz",
    "😀 foo",
    "foo 02",
  ];
  assert(
    names.every((a) =>
      names.every(
        (b) =>
          Math.sign(compareNames(a, b)) ===
          Math.sign(a.localeCompare(b, undefined, { numeric: true })),
      ),
    ),
    "reused collation preserves numeric, case, accent, punctuation, and Unicode ordering",
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "search-performance-"));
  const stops: (() => void)[] = [];
  try {
    const file = path.join(root, "foo.txt");
    fs.writeFileSync(file, "foo");
    fs.mkdirSync(path.join(root, "bar"));
    fs.writeFileSync(path.join(root, ".baz"), "hidden");
    fs.symlinkSync(file, path.join(root, "foo-link"));
    fs.symlinkSync(path.join(root, "bar"), path.join(root, "bar-link"));
    fs.symlinkSync(path.join(root, "missing"), path.join(root, "broken-link"));
    const aliasedParent = path.join(root, "parent-alias");
    fs.symlinkSync(root, aliasedParent);
    const throughParent = path.join(aliasedParent, path.basename(file));
    const realFile = fs.realpathSync(file);
    assert(
      statEntry(throughParent)?.storagePath === realFile,
      "single-entry reads resolve symlinks in parent folders for storage identity",
    );
    assert(
      (await statEntryAsync(throughParent))?.storagePath === realFile,
      "asynchronous entry reads share canonical identity through aliased parents",
    );
    assert(
      readDirectory(aliasedParent, false).entries.find(
        (entry) => entry.path === throughParent,
      )?.storagePath === realFile,
      "directory listings use canonical storage paths beneath aliased parents",
    );
    assert(
      (await readDirectoryAsync(aliasedParent, false)).entries.find(
        (entry) => entry.path === throughParent,
      )?.storagePath === realFile,
      "asynchronous listings preserve canonical storage identity beneath aliased parents",
    );
    const stats = fs.statSync(file);
    const originalStat = fs.statSync;
    let redundantStats = 0;
    let ordinary;
    try {
      fs.statSync = ((...args: Parameters<typeof fs.statSync>) => {
        redundantStats++;
        return originalStat(...args);
      }) as typeof fs.statSync;
      ordinary = statEntry(file);
    } finally {
      fs.statSync = originalStat;
    }
    assert(
      redundantStats === 0 &&
        ordinary?.size === stats.size &&
        ordinary?.ino === stats.ino,
      "ordinary entries keep their metadata without a second stat call",
    );
    for (const name of [
      "foo.txt",
      "bar",
      "foo-link",
      "bar-link",
      "broken-link",
      "missing",
    ]) {
      const full = path.join(root, name);
      assert(
        isDeepStrictEqual(await statEntryAsync(full), statEntry(full)),
        `async entry metadata agrees for ${name}`,
      );
    }
    for (const hidden of [false, true]) {
      const actual = await readDirectoryAsync(root, hidden);
      const expected = readDirectory(root, hidden);
      const byPath = (a: Entry, b: Entry) => a.path.localeCompare(b.path);
      assert(
        isDeepStrictEqual(
          { ...actual, entries: actual.entries.sort(byPath) },
          { ...expected, entries: expected.entries.sort(byPath) },
        ),
        `async directory results preserve metadata, hidden filtering, and broken links (hidden=${hidden})`,
      );
    }
    assert(
      (await readDirectoryAsync(path.join(root, "missing"), false)).error !==
        undefined,
      "async directory errors are not reported as empty successful listings",
    );
    const abortedRead = new AbortController();
    abortedRead.abort();
    assert(
      (await readDirectoryAsync(root, false, abortedRead.signal)).entries
        .length === 0,
      "a cancelled directory read does not start metadata batches",
    );

    let snapshot: DirectorySnapshot | undefined;
    let published = 0;
    let settledOnce = false;
    let restartedLoading = false;
    const stop = observeDirectory(
      root,
      false,
      (next) => {
        if (settledOnce && next.pending) restartedLoading = true;
        if (!next.pending) settledOnce = true;
        snapshot = next;
        published++;
      },
      { pollMs: 100, debounceMs: 5 },
    );
    stops.push(stop);
    assert(
      await until(() => snapshot?.pending === false),
      "the initial directory subscription settles",
    );
    const unchangedEntries = snapshot?.entries;
    const unchangedSnapshot = snapshot;
    const initialPublications = published;
    assert(
      (await until(
        () => published > initialPublications && snapshot?.pending === false,
      )) && snapshot?.entries === unchangedEntries,
      "unchanged refreshes preserve entry identity so metadata and ranking can be reused",
    );
    assert(
      !restartedLoading,
      "background directory polls never hide an already published list or reset its selection",
    );
    assert(
      snapshot === unchangedSnapshot,
      "unchanged polls preserve the whole snapshot so typed-path validation stays ready",
    );
    fs.writeFileSync(path.join(root, "new.txt"), "new");
    assert(
      await until(
        () =>
          snapshot?.entries.some((e) => e.name === "new.txt") === true &&
          !snapshot.pending,
      ),
      "a newly created file appears without typing or manual refresh",
    );
    fs.writeFileSync(file, "foo with a larger size");
    assert(
      await until(
        () => snapshot?.entries.find((e) => e.name === "foo.txt")?.size === 22,
      ),
      "file metadata changes are refreshed as well as names",
    );
    fs.renameSync(path.join(root, "new.txt"), path.join(root, "renamed.txt"));
    assert(
      await until(
        () =>
          snapshot?.entries.some((e) => e.name === "renamed.txt") === true &&
          !snapshot.entries.some((e) => e.name === "new.txt"),
      ),
      "renames remove the old name and publish the new one",
    );
    fs.unlinkSync(path.join(root, "renamed.txt"));
    assert(
      await until(
        () => snapshot?.entries.some((e) => e.name === "renamed.txt") === false,
      ),
      "deleted files disappear from the open listing",
    );
    stop();
    const countAtStop = published;
    fs.writeFileSync(path.join(root, "after-stop"), "foo");
    await pause(130);
    assert(
      published === countAtStop,
      "closing a directory stops polling and late publications",
    );

    const initiallyMissing = path.join(root, "later");
    let recovered: DirectorySnapshot | undefined;
    stops.push(
      observeDirectory(
        initiallyMissing,
        false,
        (next) => {
          recovered = next;
        },
        { pollMs: 30 },
      ),
    );
    assert(
      await until(() => recovered?.error !== undefined),
      "an unavailable directory surfaces a read error",
    );
    fs.mkdirSync(initiallyMissing);
    fs.writeFileSync(path.join(initiallyMissing, "baz.txt"), "baz");
    assert(
      await until(
        () =>
          recovered?.pending === false &&
          recovered.error === undefined &&
          recovered.entries.length === 1,
      ),
      "polling recovers when filesystem watching could not be started",
    );

    const large = path.join(root, "large");
    fs.mkdirSync(large);
    for (let i = 0; i < MAX_ENTRIES + 1; i++)
      fs.writeFileSync(path.join(large, `foo-${i}`), "");
    const asyncLarge = await readDirectoryAsync(large, false);
    assert(
      asyncLarge.truncated > 0 &&
        asyncLarge.entries.length === MAX_ENTRIES &&
        new Set(asyncLarge.entries.map((entry) => entry.path)).size ===
          MAX_ENTRIES &&
        asyncLarge.entries.every((entry) => fs.existsSync(entry.path)),
      "async listings cap retained entries, preserve valid unique paths, and report omissions",
    );
  } finally {
    for (const stop of stops) stop();
    fs.rmSync(root, { recursive: true, force: true });
  }

  // The index crawl is the only search-time subprocess left. It must not start
  // after cancellation, and must not outlive it.
  const beforeStart = new AbortController();
  beforeStart.abort();
  let yielded = 0;
  for await (const _chunk of spawnFdDefault(
    process.execPath,
    ["-e", "process.stdout.write('x')"],
    beforeStart.signal,
  ))
    yielded++;
  assert(yielded === 0, "a cancelled scan never starts an fd process");

  const controller = new AbortController();
  let crawlFailed: unknown;
  let childPid: number | undefined;
  try {
    for await (const chunk of spawnFdDefault(
      process.execPath,
      [
        "-e",
        "process.stdout.write(process.pid + '\\0'); setInterval(() => {}, 1000)",
      ],
      controller.signal,
    )) {
      childPid = Number.parseInt(String(chunk).split("\0")[0], 10);
      controller.abort();
    }
  } catch (error) {
    crawlFailed = error;
  }
  const gone = () => {
    try {
      process.kill(childPid!, 0);
      return false;
    } catch {
      return true;
    }
  };
  assert(
    crawlFailed === undefined &&
      Number.isInteger(childPid) &&
      (await until(gone)),
    "cancelling an active scan kills fd without reporting a scan failure",
  );

  const metadataAbort = new AbortController();
  let metadataCalls = 0;
  const meta = await readUsageMetaResult(
    ["/foo", "/bar"],
    { signal: metadataAbort.signal },
    async (_args, _timeout, signal) => {
      metadataCalls++;
      assert(
        signal === metadataAbort.signal,
        "metadata subprocesses receive the cancellation signal",
      );
      metadataAbort.abort();
      throw new Error("cancelled");
    },
  );
  assert(
    metadataCalls === 1 &&
      meta.cancelled === true &&
      meta.error === undefined &&
      meta.partial === undefined,
    "cancelled metadata reads do not retry individual paths or report failures",
  );

  const progress = deriveProgress({
    rankingReady: true,
    scoped: false,
    isPathQuery: true,
    folderMetaPending: true,
    query: "/foo/ba",
    isHiddenOnly: false,
    searching: false,
    termLength: 7,
    minQuery: 3,
    rankingPending: false,
  });
  assert(
    progress.folder === "running" && progress.index === "skipped",
    "an unfinished path listing keeps folder status running without querying the index",
  );
}
