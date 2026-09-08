import { runSpotlightSearch, readUsageMetaResult } from "../src/lib/spotlight";
import { createRecentValidator } from "../src/lib/recent-validation";
import { Entry } from "../src/lib/types";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { walkSearch, listUnder } from "../src/lib/walk";
import { parseQuery } from "../src/lib/query";
import { readDirectoryAsync } from "../src/lib/directory-listing";
import { createWorkQueue } from "../src/lib/work-queue";

const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Catch whole-query cutoffs, buffering, and publications after cancellation. */
export async function liveSearchChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const fuzzyQueries: string[][] = [];
  const fuzzy = await runSpotlightSearch(
    "foob",
    { fuzzy: true, max: Infinity },
    async (args) => {
      fuzzyQueries.push(args);
      if (args.includes("-name")) return "/foo/foob.txt\0";
      if (
        args.at(-1) ===
        'kMDItemFSName == "*f*"cd && kMDItemFSName == "*o*"cd && kMDItemFSName == "*b*"cd'
      )
        return "/foo/foo_bar\0/foo/foob.txt\0/foo/bof.txt\0";
      return "";
    },
  );
  assert(
    fuzzy.paths.join("\0") === "/foo/foob.txt\0/foo/foo_bar",
    "a cold fuzzy search finds a separated name, deduplicates literal hits, and rejects wrong character order",
  );
  assert(
    fuzzyQueries[0]?.join("\0") === "-0\0-name\0foob",
    "ordinary Spotlight matches are requested before the broader fuzzy pass",
  );
  const cancelFuzzy = new AbortController();
  let fuzzyStarts = 0;
  await runSpotlightSearch(
    "foob",
    {
      fuzzy: true,
      signal: cancelFuzzy.signal,
      onBatch: () => cancelFuzzy.abort(),
    },
    async () => {
      fuzzyStarts++;
      return "/foo/foob\0";
    },
  );
  assert(
    fuzzyStarts === 1,
    "cancelling literal results prevents the fuzzy process from starting",
  );
  const unsafeArgs: string[][] = [];
  await runSpotlightSearch('foo" || bar', { fuzzy: true }, async (args) => {
    unsafeArgs.push(args);
    return "";
  });
  assert(
    unsafeArgs.length === 1 &&
      unsafeArgs[0].at(-1) === 'foo" || bar' &&
      unsafeArgs[0].includes("-name"),
    "query punctuation stays a literal argument and cannot inject a Spotlight predicate",
  );
  let release = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const batches: string[][] = [];
  const active = new AbortController();
  async function* output() {
    yield "/foo/bar\0";
    await waiting;
    yield "/foo/baz\0";
  }
  const result = runSpotlightSearch(
    "foo",
    {
      signal: active.signal,
      max: Infinity,
      onBatch: (paths: string[]) => {
        batches.push(paths);
      },
    } as Parameters<typeof runSpotlightSearch>[1],
    output as unknown as Parameters<typeof runSpotlightSearch>[2],
  );
  await turn();
  assert(
    batches.flat().includes("/foo/bar"),
    "live Spotlight publishes an early path before the process exits",
  );
  active.abort();
  release();
  await result;
  assert(
    !batches.flat().includes("/foo/baz"),
    "cancelled Spotlight cannot publish a late batch",
  );

  const encoded = Buffer.from("/foo/bár\0/foo/baz\nqux\0");
  const unicode = await runSpotlightSearch(
    "foo",
    { max: Infinity },
    async function* () {
      for (const byte of encoded) yield Buffer.from([byte]);
    },
  );
  assert(
    unicode.paths.join("\0") === "/foo/bár\0/foo/baz\nqux",
    "Spotlight streaming preserves split UTF-8 characters and filenames containing newlines",
  );
  const manyPaths = Array.from({ length: 4005 }, (_, i) => `/foo/bar${i}`);
  let cappedCount = 0;
  let producerClosed = false;
  const capped = await runSpotlightSearch(
    "foo",
    {
      max: Infinity,
      onBatch: (batch) => {
        cappedCount += batch.length;
      },
    },
    async function* () {
      try {
        for (let i = 0; i < 10000; i++) yield `/foo/bar${i}\0`;
      } finally {
        producerClosed = true;
      }
    },
  );
  assert(
    cappedCount === 5000 && capped.truncated && producerClosed,
    "Spotlight closes its producer at the hard candidate cap even if a caller asks for unlimited results",
  );
  let streamed = 0;
  let rawClosed = false;
  let rawProduced = 0;
  const rawLimited = await runSpotlightSearch(
    "foob",
    { fuzzy: true, max: Infinity },
    async function* (args) {
      if (args.includes("-name")) return;
      try {
        for (let i = 0; i < 200000; i += 60) {
          rawProduced += 60;
          yield Array.from({ length: 60 }, (_, j) => `/foo/zzz${i + j}`).join(
            "\0",
          ) + "\0";
        }
      } finally {
        rawClosed = true;
      }
    },
  );
  assert(
    rawLimited.truncated &&
      rawLimited.paths.length === 0 &&
      rawClosed &&
      rawProduced <= 100020,
    "fuzzy search stops excessive raw candidates even when none pass the filename matcher",
  );
  const many = await runSpotlightSearch(
    "foo",
    {
      max: Infinity,
      onBatch: (batch) => {
        streamed += batch.length;
      },
    },
    async function* () {
      yield manyPaths.join("\0") + "\0";
    },
  );
  assert(
    streamed === 4005 && !many.truncated && many.paths.length === 0,
    "live Spotlight passes its old four-thousand-path cap without retaining a duplicate path buffer",
  );

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
    continuous: true,
  } as Parameters<typeof validate>[1]);
  assert(
    checked.entries.length === 125,
    "live cached search continues beyond its first sixty matches",
  );
  let metadataCalls = 0;
  const metadataProgress: number[] = [];
  const metadata = await readUsageMetaResult(
    candidates.slice(0, 26).map((item) => item.path),
    {
      continuous: true,
      onProgress: (meta: Map<string, unknown>) =>
        metadataProgress.push(meta.size),
    } as Parameters<typeof readUsageMetaResult>[1],
    async () => {
      if (metadataCalls++ === 0) throw { code: "ETIMEDOUT" };
      return "NULL\0" + "2\0";
    },
  );
  assert(
    metadata.meta.has("/foo/bar25") &&
      !metadata.complete &&
      metadataProgress.length > 0,
    "live metadata skips a stalled batch and continues checking later files",
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "live-search-"));
  try {
    for (let i = 0; i < 3005; i++)
      fs.writeFileSync(path.join(root, `foo${i}.txt`), "foo");
    const paths: string[] = [];
    const walked = await walkSearch(root, parseQuery("foo"), {
      continuous: true,
      onBatch: (batch: string[]) => {
        paths.push(...batch);
      },
    } as Parameters<typeof walkSearch>[2]);
    assert(
      paths.length === 3000 && walked.truncated,
      "live folder search bounds a large directory and reports that the scan was capped",
    );
    let published = 0;
    const listing = await readDirectoryAsync(root, false, undefined, {
      continuous: true,
      onProgress: (entries: Entry[]) => {
        published = entries.length;
      },
    });
    assert(
      listing.entries.length === 3000 && listing.truncated > 0 && published > 0,
      "live directory listing retains a bounded number of entries and reports omissions",
    );
    const limited = await walkSearch(root, parseQuery("foo"), {
      continuous: true,
      limit: 25,
    });
    assert(
      limited.paths.length === 25 && limited.truncated,
      "a continuous folder search honors its collection limit and keeps the matches already found",
    );
    const names = await fsp.readdir(root);
    const originalStat = fsp.stat;
    let releaseStat = () => {};
    const blocked = new Promise<void>((resolve) => {
      releaseStat = resolve;
    });
    const listingController = new AbortController();
    let laterFile = false;
    try {
      fsp.stat = (async (full, ...args: unknown[]) => {
        if (String(full) === path.join(root, names[0])) await blocked;
        return Reflect.apply(originalStat, fsp, [full, ...args]);
      }) as typeof fsp.stat;
      const pending = readDirectoryAsync(
        root,
        false,
        listingController.signal,
        {
          continuous: true,
          onProgress: (entries) => {
            laterFile ||= entries.some((entry) => entry.name === names[100]);
          },
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      assert(
        laterFile,
        "one stalled directory entry cannot block healthy later entries",
      );
      listingController.abort();
      releaseStat();
      await pending;
    } finally {
      releaseStat();
      fsp.stat = originalStat;
    }
    const child = path.join(root, "bar");
    fs.mkdirSync(child);
    fs.writeFileSync(path.join(child, "baz.txt"), "baz");
    const nested: string[] = [];
    await listUnder([root, child], {
      continuous: true,
      onBatch: (batch) => {
        nested.push(...batch);
      },
    });
    assert(
      nested.filter((full) => full === path.join(child, "baz.txt")).length ===
        1,
      "nested expansion roots do not traverse or emit the same subtree twice",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
