import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { compareNames } from "../src/lib/name-order";
import { MAX_ENTRIES, readDirectory, statEntry } from "../src/lib/read-dir";
import {
  DirectorySnapshot,
  observeDirectory,
  readDirectoryAsync,
  statEntryAsync,
} from "../src/lib/directory-listing";
import { readUsageMetaResult, runSpotlightSearch } from "../src/lib/spotlight";
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
      assert(
        isDeepStrictEqual(
          await readDirectoryAsync(root, hidden),
          readDirectory(root, hidden),
        ),
        `async directory results preserve order, hidden filtering, and broken links (hidden=${hidden})`,
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
    const stop = observeDirectory(
      root,
      false,
      (next) => {
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
    const initialPublications = published;
    assert(
      (await until(
        () => published > initialPublications && snapshot?.pending === false,
      )) && snapshot?.entries === unchangedEntries,
      "unchanged refreshes preserve entry identity so metadata and ranking can be reused",
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
    const syncLarge = readDirectory(large, false);
    const asyncLarge = await readDirectoryAsync(large, false);
    assert(
      asyncLarge.truncated === 1 && isDeepStrictEqual(asyncLarge, syncLarge),
      "async listings preserve the entry cap, truncation count, and selection order",
    );
  } finally {
    for (const stop of stops) stop();
    fs.rmSync(root, { recursive: true, force: true });
  }

  const beforeStart = new AbortController();
  beforeStart.abort();
  let calls = 0;
  const stopped = await runSpotlightSearch(
    "foo",
    { signal: beforeStart.signal },
    async () => {
      calls++;
      return "";
    },
  );
  assert(
    calls === 0 && stopped.cancelled === true && stopped.error === undefined,
    "a superseded search never starts a Spotlight process",
  );

  const controller = new AbortController();
  let childClosed = false;
  let receivedSignal = false;
  const stoppedDuring = await runSpotlightSearch(
    "foo",
    { signal: controller.signal },
    (_args, signal) => {
      receivedSignal = signal === controller.signal;
      return new Promise<string>((resolve, reject) => {
        const child = execFile(
          process.execPath,
          ["-e", "setInterval(() => {}, 1000)"],
          { signal, timeout: 2000, killSignal: "SIGKILL" },
          (error, stdout) => {
            if (error) reject(error);
            else resolve(stdout);
          },
        );
        child.on("close", () => {
          childClosed = true;
        });
        child.once("spawn", () => controller.abort());
      });
    },
  );
  assert(
    receivedSignal &&
      stoppedDuring.cancelled === true &&
      stoppedDuring.error === undefined &&
      (await until(() => childClosed)),
    "cancelling an active search terminates its child process without a search-failed result",
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
    progress.folder === "running" && progress.spotlight === "skipped",
    "an unfinished path listing keeps folder status running without starting Spotlight",
  );
}
