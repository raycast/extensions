import assert from "node:assert/strict";
import test from "node:test";
import {
  bucketPicture,
  bucketsOf,
  isDone,
  remainingBytes,
  groupCopies,
  pilesOf,
  sourcesOf,
  uninstallPlan,
  undoTitle,
  type DiskScan,
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
    Buffer.from(bucketPicture(optimizable, [optimizable], "dark", state).match(/base64,([^)?]+)/)![1], "base64").toString();
  assert.match(pane({ struck: new Set(["1", "2"]), running: "Optimizing · 2 of 3" }), /Optimizing · 2 of 3/);
  assert.match(pane({ struck: new Set(["1", "2"]) }), />5 B</);
  const done = pane({ struck: new Set(["1", "2", "3"]), gone: new Set(["1", "2", "3"]), receipt: { bytes: 25, text: "back · nothing deleted" } });
  assert.match(done, /back · nothing deleted · 2 files/);
  assert.match(done, />25 B</);
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
