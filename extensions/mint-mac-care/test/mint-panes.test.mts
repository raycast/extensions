import assert from "node:assert/strict";
import test from "node:test";
import {
  bucketPicture,
  bucketsOf,
  presented,
  sourcePicture,
  finishedRows,
  isDone,
  remainingBytes,
  groupCopies,
  pilePicture,
  pilesOf,
  sourcesOf,
  uninstallPlan,
  undoTitle,
  type DiskScan,
  type OptimizeScan,
  type MemoryScan,
  type UninstallScan,
} from "../src/mint-panes.ts";

const item = (id: string, sizeBytes: number, extra: Record<string, unknown>) => ({
  id,
  label: id,
  path: `/Users/x/${id}`,
  sizeBytes,
  defaultSelected: false,
  tier: "needs-review" as const,
  ...extra,
});

test("Free Disk uses the Disk page's groups, and never guesses Yours for an older Mint", () => {
  const stated: DiskScan = {
    sessionID: "s",
    sections: [
      {
        id: "a",
        title: "Caches",
        items: [
          item("cache", 300, { group: "rebuildable", chip: "Caches" }),
          item("photo", 500, { group: "clutter", chip: "Captures" }),
          item("kept", 900, { group: "retained" }),
        ],
      },
    ],
  };
  const buckets = bucketsOf(stated, { sessionID: "o", items: [] }, false);
  assert.deepEqual(
    buckets.map((bucket) => [bucket.key, bucket.bytes]),
    [
      ["optimizable", 0],
      ["safeToClean", 300],
      ["yours", 500],
    ],
  );
  assert.equal(buckets[2].entries[0].detail, "Captures");

  const older: DiskScan = {
    sessionID: "s",
    sections: [{ id: "a", title: "Caches", items: [item("c", 1, { tier: "recommended" }), item("d", 2, {})] }],
  };
  assert.deepEqual(
    bucketsOf(older, undefined, true).map((bucket) => bucket.key),
    ["optimizable", "safeToClean", "look"],
  );
  // Before any answer, the groups are there, empty, named as this Mint names them.
  assert.deepEqual(
    bucketsOf(undefined, undefined, true).map((bucket) => [bucket.key, bucket.entries.length]),
    [
      ["optimizable", 0],
      ["safeToClean", 0],
      ["yours", 0],
    ],
  );
});

test("a file and its copies are one row, struck only when every copy is done", () => {
  const [optimizable] = bucketsOf(
    undefined,
    {
      sessionID: "o",
      items: [
        { id: "1", path: "/Users/x/a 2.png", keeper: "/Users/x/a.png", estimatedSavingBytes: 10 },
        { id: "2", path: "/Users/x/a 3.png", keeper: "/Users/x/a.png", estimatedSavingBytes: 10 },
        { id: "3", path: "/Users/x/b 2.png", keeper: "/Users/x/b.png", estimatedSavingBytes: 5 },
      ],
    },
    true,
  );
  assert.deepEqual(
    optimizable.entries.map((entry) => [entry.title, entry.ids, entry.detail]),
    [
      ["a.png", ["1", "2"], "3 copies"],
      ["b.png", ["3"], "2 copies"],
    ],
  );
  assert.equal(isDone(["1", "2"], new Set(["1"])), false);
  assert.equal(remainingBytes(optimizable.entries, new Set(["1", "2"])), 5);
  // The pane counts down with the strikes and says what came back at the end.
  const pane = (state: Parameters<typeof bucketPicture>[3]) =>
    Buffer.from(
      bucketPicture(optimizable, [optimizable], "dark", state).match(/base64,([^)?]+)/)![1],
      "base64",
    ).toString();
  assert.match(pane({ struck: new Set(["1", "2"]), running: "Optimizing · 2 of 3" }), /Optimizing · 2 of 3/);
  // The number and its unit are drawn apart: the number large and light, the unit small.
  const said = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
  assert.match(said(pane({ struck: new Set(["1", "2"]) })), /^5 B /);
  const done = pane({
    struck: new Set(["1", "2", "3"]),
    gone: new Set(["1", "2", "3"]),
    receipt: { bytes: 25, text: "back · nothing deleted" },
  });
  assert.match(done, /back · nothing deleted · 2 files/);
  assert.match(said(done), /^25 B /);
  assert.doesNotMatch(done, /a\.png/);
});

test("Optimize groups each file's copies by the source they live in, AI tools first", () => {
  const groups = groupCopies(
    [
      { id: "1", path: "/Users/x/.codex/a.png", keeper: "/Users/x/Downloads/a.png", estimatedSavingBytes: 10 },
      { id: "2", path: "/Users/x/Documents/a.png", keeper: "/Users/x/Downloads/a.png", estimatedSavingBytes: 10 },
      { id: "3", path: "/Users/x/Documents/b.png", keeper: "/Users/x/Downloads/a.png", estimatedSavingBytes: 10 },
    ],
    "/Users/x",
  );
  const sources = sourcesOf(groups);
  assert.deepEqual(
    sources.map((source) => [source.key, source.bytes, source.groups[0].copies.length]),
    [
      ["agent:codex", 10, 1],
      ["files", 20, 2],
    ],
  );
});

test("memory piles add up to no more than macOS reports in use", () => {
  const app = (id: string, bytes: number, extra: Record<string, boolean>) => ({
    id,
    name: id,
    bytes,
    processCount: 1,
    selectable: true,
    advanced: false,
    needsReview: false,
    defaultSelected: false,
    ...extra,
  });
  const scan: MemoryScan = {
    sessionID: "m",
    detailsUnavailable: false,
    usedBytes: 600,
    items: [
      app("idle", 400, { defaultSelected: true }),
      app("busy", 300, {}),
      app("forced", 300, { advanced: true }),
      app("system", 200, { selectable: false }),
    ],
  };
  const piles = pilesOf(scan);
  assert.deepEqual(
    piles.map((pile) => pile.key),
    ["idle", "inUse", "askFirst"],
  );
  assert.ok(piles.reduce((sum, pile) => sum + pile.bytes, 0) <= 600);
});

test("Idle is Mint's own pile when Mint names it (1.2.1), else what Mint ticks by itself (1.2.0)", () => {
  const app = (id: string, extra: Partial<MemoryScan["items"][number]>): MemoryScan["items"][number] => ({
    id,
    name: id,
    bytes: 100,
    processCount: 1,
    selectable: true,
    advanced: false,
    needsReview: false,
    defaultSelected: false,
    ...extra,
  });
  const keys = (items: MemoryScan["items"]) =>
    Object.fromEntries(
      pilesOf({ sessionID: "m", detailsUnavailable: false, usedBytes: 1000, items }).flatMap((pile) =>
        pile.apps.map((one) => [one.id, pile.key]),
      ),
    );
  // Mint 1.2.1: the page's piles, whatever defaultSelected says (an idle app under 500 MB is not ticked by itself;
  // a large app in use is).
  assert.deepEqual(
    keys([
      app("idle-small", { pile: "idle", defaultSelected: false }),
      app("in-use-large", { pile: "inUse", defaultSelected: true }),
      app("keep", { pile: "keep" }),
      app("forced", { pile: "inUse", advanced: true }),
      app("no-pile", { pile: null }),
    ]),
    { "idle-small": "idle", "in-use-large": "inUse", keep: "askFirst", forced: "askFirst", "no-pile": "inUse" },
  );
  // Mint 1.2.0 sends no pile: nothing changes.
  assert.deepEqual(
    keys([app("ticked", { defaultSelected: true }), app("other", {}), app("asks", { needsReview: true })]),
    {
      ticked: "idle",
      other: "inUse",
      asks: "askFirst",
    },
  );
});

test('after Quit Chosen, only an app that was asked to quit and did not reads "kept running"', () => {
  const app = (id: string, bytes: number): MemoryScan["items"][number] => ({
    id,
    name: id,
    bytes,
    processCount: 1,
    selectable: true,
    advanced: false,
    needsReview: false,
    defaultSelected: false,
  });
  const scan: MemoryScan = {
    sessionID: "m",
    detailsUnavailable: false,
    usedBytes: 4000,
    items: [app("Spotify", 388), app("Obsidian", 110), app("Discord", 278)],
  };
  const piles = pilesOf(scan);
  const inUse = piles.find((pile) => pile.key === "inUse")!;
  const svg = (state: Parameters<typeof pilePicture>[4]) =>
    Buffer.from(pilePicture(inUse, piles, 4000, "dark", state).match(/base64,([^)?]+)/)![1], "base64").toString("utf8");
  // Discord chosen and quit; Spotify and Obsidian never asked (the VM's 2026-11-10 run read "3 kept running"). By the
  // time the receipt shows, the strike has folded Discord away (`gone`), as a person sees it.
  const quit = svg({
    struck: new Set(["Discord"]),
    gone: new Set(["Discord"]),
    receipt: { bytes: 38, text: "freed", asked: ["Discord"] },
  });
  assert.doesNotMatch(quit, /kept running/);
  assert.match(quit, /freed · 1 app quit/);
  // Spotify chosen and still running; Obsidian never asked.
  const kept = svg({ receipt: { bytes: 0, text: "freed", asked: ["Spotify"] } });
  assert.match(kept, /· 1 kept running/);
  assert.equal(kept.match(/kept running/g)?.length, 2, "the line and Spotify's row, never Obsidian's");
  // A receipt that does not say which apps were asked keeps the old reading: every app left kept running.
  assert.match(svg({ receipt: { bytes: 0, text: "freed" } }), /· 3 kept running/);
});

test("uninstalling takes the app and its leftovers, never what is on the Ignore list", () => {
  const remnant = (id: string, boundary: "ordinary" | "needs-review" | "protected", category = "caches") => ({
    id,
    category,
    categoryTitle: category,
    label: id,
    path: `/x/${id}`,
    sizeBytes: 10,
    boundary,
    requiresAdmin: false,
    defaultSelected: false,
    selectable: boundary !== "protected",
  });
  const scan: UninstallScan = {
    sessionID: "u",
    appName: "Magnet",
    appPath: "/Applications/Magnet.app",
    bundleIdentifier: "m",
    itemCount: 4,
    totalBytes: 40,
    items: [
      remnant("app", "ordinary", "app-bundle"),
      remnant("cache", "ordinary"),
      remnant("asks", "needs-review"),
      remnant("kept", "protected"),
    ],
  };
  const plan = uninstallPlan(scan);
  assert.deepEqual(
    plan.items.map((entry) => entry.id),
    ["app", "cache"],
  );
  assert.equal(plan.bytes, 20);
});

test("each Mint run is named for what it did", () => {
  const batch = (trigger: string, fileNames: string[], folderPath = "/Users/x/Desktop") => ({
    id: "b",
    kind: "journal" as const,
    timestamp: "2026-09-30T00:00:00Z",
    trigger,
    folderPath,
    operationCount: 3,
    totalBytes: 9,
    fileNames,
  });
  assert.equal(undoTitle(batch("reorganize", [])), "Organized Desktop");
  assert.equal(undoTitle(batch("uninstall", ["Alder", "Alder.app"], "/Applications")), "Uninstalled Alder");
  assert.equal(undoTitle(batch("disk-flow-segment", [])), "Moved 3 items to the Trash");
});

test("a removal strikes only rows Mint did not name as failed, and none when it cannot tell", () => {
  const rows = [
    { id: "cache", path: "/Users/x/Library/Caches/Codex" },
    { id: "log", path: "/Users/x/Library/Logs/old.log" },
    { id: "npm", path: "/Users/x/.npm" },
  ];
  // Mint names a file inside the cache row, as it does for a row of many files.
  assert.deepEqual(finishedRows(rows, 1, [{ path: "/Users/x/Library/Caches/Codex/Cache_Data/f_00a1" }]), [
    "log",
    "npm",
  ]);
  assert.deepEqual(finishedRows(rows, 1, [{ path: "/Users/x/Library/Logs/old.log" }]), ["cache", "npm"]);
  // A path that only starts with a row's name is not inside it.
  assert.deepEqual(finishedRows(rows, 1, [{ path: "/Users/x/.npmrc" }]), ["cache", "log", "npm"]);
  // Two failures counted, one named: which other row failed cannot be told.
  assert.deepEqual(finishedRows(rows, 2, [{ path: "/Users/x/.npm" }]), []);
  assert.deepEqual(finishedRows(rows, 1, undefined), []);
  assert.deepEqual(finishedRows(rows, 0, undefined), ["cache", "log", "npm"]);
});

// Mint 1.1.3 (`surface.optimizable.v1`): Optimizable's two halves, as the app lists them.
const bothHalves: OptimizeScan = {
  sessionID: "o",
  includesCompressions: true,
  items: [
    {
      id: "c1",
      kind: "copy",
      reason: "Identical copy",
      path: "/Users/x/Documents/a 2.png",
      keeper: "/Users/x/Documents/a.png",
      estimatedSavingBytes: 100,
    },
    {
      id: "c2",
      kind: "copy",
      reason: "Identical copy",
      path: "/Users/x/Downloads/old/b 2.zip",
      keeper: "/Users/x/Downloads/old/b.zip",
      estimatedSavingBytes: 700,
    },
    {
      id: "z1",
      kind: "compression",
      reason: "Idle file",
      path: "/Users/x/.codex/sessions/r.jsonl",
      estimatedSavingBytes: 300,
    },
    {
      id: "z2",
      kind: "compression",
      reason: "Idle file",
      path: "/Users/x/Documents/notes.txt",
      estimatedSavingBytes: 50,
    },
  ],
};
const said = (markdown: string) =>
  [
    ...Buffer.from(markdown.match(/base64,([^)?]+)/)![1], "base64")
      .toString()
      .matchAll(/<text[^>]*>([^<]*)<\/text>/g),
  ]
    .map((m) => m[1])
    .join(" ");

test("Optimize lists identical copies and idle files, each in the app's words, by source", () => {
  const groups = groupCopies(bothHalves.items, "/Users/x");
  assert.deepEqual(
    groups.map((group) => [group.kind, group.keeper, group.copies.map((copy) => copy.id)]),
    [
      ["copy", "/Users/x/Downloads/old/b.zip", ["c2"]],
      ["compression", "/Users/x/.codex/sessions/r.jsonl", ["z1"]],
      ["copy", "/Users/x/Documents/a.png", ["c1"]],
      ["compression", "/Users/x/Documents/notes.txt", ["z2"]],
    ],
  );
  const sources = sourcesOf(groups);
  assert.deepEqual(
    sources.map((source) => [source.key, source.bytes]),
    [
      ["agent:codex", 300],
      ["files", 850],
    ],
  );
  const files = said(sourcePicture(sources[1], sources, "dark", {}, true));
  assert.match(files, /2 copies shared, 1 idle file compressed · nothing deleted/);
  assert.match(files, /Identical copy|2 copies/);
  assert.match(files, /Idle file/);
  const codex = said(sourcePicture(sources[0], sources, "dark", {}, true));
  assert.match(codex, /1 idle file stored compressed · nothing deleted/);
  // An empty source with this Mint says nothing to optimize, not only no copies.
  assert.match(
    said(sourcePicture({ key: "tmp", groups: [], bytes: 0 }, sources, "dark", {}, true)),
    /Nothing to optimize here/,
  );
  assert.match(said(sourcePicture({ key: "tmp", groups: [], bytes: 0 }, sources, "dark")), /No identical copies here/);
});

test("Optimize sends both kinds: every id of the review, copies and idle files", () => {
  const sources = sourcesOf(groupCopies(bothHalves.items, "/Users/x"));
  const ids = sources.flatMap((source) => source.groups).flatMap((group) => group.copies.map((copy) => copy.id));
  assert.deepEqual(ids.sort(), ["c1", "c2", "z1", "z2"]);
});

test("with Mint 1.1.2 Optimize lists copies only and claims nothing about compression", () => {
  const older: OptimizeScan = {
    sessionID: "o",
    items: [
      { id: "1", path: "/Users/x/Documents/a 2.png", keeper: "/Users/x/Documents/a.png", estimatedSavingBytes: 10 },
    ],
  };
  const sources = sourcesOf(groupCopies(older.items, "/Users/x"));
  const words = said(sourcePicture(sources[0], sources, "dark"));
  assert.match(words, /1 file shares its copies · nothing deleted/);
  assert.doesNotMatch(words, /compress|idle/i);
  const [optimizable] = bucketsOf(undefined, older, true);
  assert.equal(optimizable.bothHalves, undefined);
  assert.match(
    said(bucketPicture({ ...optimizable, entries: [], bytes: 0 }, [optimizable], "dark")),
    /No identical copies/,
  );
});

const yoursRow: DiskScan = {
  sessionID: "s",
  sections: [
    {
      id: "a",
      title: "Old downloads",
      items: [
        { ...item("old", 5_000, { group: "clutter", chip: "Downloads" }), path: "/Users/x/Downloads/old" },
        { ...item("cache", 200, { group: "rebuildable" }), path: "/Users/x/Library/Caches/x" },
      ],
    },
  ],
};
const headline = (buckets: ReturnType<typeof bucketsOf>) => buckets.reduce((sum, bucket) => sum + bucket.bytes, 0);

test("Free Disk's headline counts no byte twice: Mint 1.1.3 says what the Disk page offers", () => {
  // The copy inside the Yours folder is that folder's; Mint's present says so.
  const buckets = bucketsOf(yoursRow, bothHalves, true, {
    offeredItemIDs: ["c1", "z1", "z2"],
    supersededDiskItemIDs: [],
  });
  assert.deepEqual(
    buckets.map((bucket) => [bucket.key, bucket.bytes]),
    [
      ["optimizable", 450],
      ["safeToClean", 200],
      ["yours", 5_000],
    ],
  );
  assert.equal(headline(buckets), 5_650);
  assert.equal(buckets[0].bothHalves, true);
  assert.deepEqual(
    buckets[0].entries.map((entry) => [entry.kind, entry.detail]),
    [
      ["compression", "Idle file"],
      ["copy", "2 copies"],
      ["compression", "Idle file"],
    ],
  );
  assert.match(said(bucketPicture(buckets[0], buckets, "dark")), /1 copy shared, 2 idle files compressed/);
  // A file of the person's own that is also a copy: the page offers to share it
  // and leaves the removal row out.
  const swapped = bucketsOf(yoursRow, bothHalves, true, {
    offeredItemIDs: ["c1", "c2", "z1", "z2"],
    supersededDiskItemIDs: ["old"],
  });
  assert.deepEqual(
    swapped.map((bucket) => bucket.bytes),
    [1_150, 200, 0],
  );
  assert.equal(headline(swapped), 1_350);
});

test("before Mint has answered, or with Mint 1.1.2, a copy under a listed row is that row's", () => {
  const buckets = bucketsOf(yoursRow, bothHalves, true);
  assert.deepEqual(
    buckets.map((bucket) => bucket.bytes),
    [450, 200, 5_000],
  );
  const older = bucketsOf(
    yoursRow,
    { sessionID: "o", items: bothHalves.items.filter((copy) => copy.kind === "copy") },
    true,
  );
  assert.deepEqual(
    older.map((bucket) => bucket.bytes),
    [100, 200, 5_000],
  );
  // A sibling whose name only starts like the folder stays Optimizable's.
  const sibling = bucketsOf(
    yoursRow,
    {
      sessionID: "o",
      items: [{ id: "s", path: "/Users/x/Downloads/older/c 2.bin", keeper: "/Users/x/c.bin", estimatedSavingBytes: 9 }],
    },
    true,
  );
  assert.equal(sibling[0].bytes, 9);
});

test("Optimize Storage keeps only what the Disk page offers", () => {
  assert.deepEqual(
    presented(bothHalves, { offeredItemIDs: ["z1"], supersededDiskItemIDs: [] }).map((copy) => copy.id),
    ["z1"],
  );
  assert.equal(presented(bothHalves, undefined).length, 4);
});
