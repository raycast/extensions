import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { buildExtIndex, canonicalPath, isInsideDir } from "../src/core/config.js";
import { findDuplicates } from "../src/core/dedup.js";
import { executePlan } from "../src/core/execute.js";
import { moveFile } from "../src/core/move.js";
import { buildPlan } from "../src/core/plan.js";
import { scanDest, scanSource } from "../src/core/scan.js";
import { getLastRun, undoLastRun, undoRun } from "../src/core/undo.js";

const extIndex = buildExtIndex({ categories: { Images: ["jpg"], Documents: ["txt"] } });
const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const tmpDirs = [];
after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tidy-test-"));
  tmpDirs.push(dir);
  return dir;
}

function write(dir, rel, content) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}

async function plan(sourceDir, destDir, scanOpts = {}) {
  const sourceFiles = scanSource(sourceDir, scanOpts);
  const destFiles = scanDest(destDir, { skipDirs: new Set([".tidy", "Duplicates", "Review"]) });
  const duplicates = await findDuplicates(sourceFiles, destFiles);
  return buildPlan({ sourceFiles, duplicates, destDir, extIndex, fallbackCategory: "Others", folderName: (b) => b });
}

test("archives into category/date buckets and writes a run manifest", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "aaa");
  write(src, "b.jpg", "not really a jpg");
  write(src, "c.xyz", "zz");

  const { manifestPath } = executePlan(await plan(src, dest), { destDir: dest, sourceDir: src });

  assert.ok(fs.existsSync(path.join(dest, "Documents", ym, "a.txt")));
  assert.ok(fs.existsSync(path.join(dest, "Images", ym, "b.jpg")));
  assert.ok(fs.existsSync(path.join(dest, "Others", ym, "c.xyz")));
  assert.ok(!fs.existsSync(path.join(src, "a.txt")));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.moves.length, 3);
  assert.equal(manifest.sourceDir, src);
  // The write-then-rename leaves no .tmp behind
  assert.equal(fs.readdirSync(path.dirname(manifestPath)).filter((f) => f.endsWith(".tmp")).length, 0);
});

test("quarantines a byte-identical file under another name and records it in manifest.md", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "photo.jpg", "SAMEBYTES");
  write(src, "photo copy.jpg", "SAMEBYTES");

  const entries = await plan(src, dest);
  const dup = entries.find((e) => e.action === "duplicate");
  assert.equal(dup.name, "photo copy.jpg"); // the "copy" marker is penalised, so the plain name is kept
  assert.ok(dup.keeperPath.endsWith("photo.jpg"));

  executePlan(entries, { destDir: dest, sourceDir: src });
  assert.ok(fs.existsSync(path.join(dest, "Images", ym, "photo.jpg")));
  assert.ok(fs.existsSync(path.join(dest, "Duplicates", "photo copy.jpg")));
  assert.match(fs.readFileSync(path.join(dest, "Duplicates", "manifest.md"), "utf8"), /photo copy\.jpg/);
});

test("the similar-files report lands in .tidy and names where the files ended up", () => {
  const src = tmp();
  const dest = tmp();
  const a = write(src, "shot.jpg", "AAA");
  const b = write(src, "shot-2.jpg", "BBB");
  const toA = path.join(dest, "Images", "shot.jpg");
  const toB = path.join(dest, "Images", "shot-2.jpg");

  const { similarReportPath } = executePlan(
    [
      { from: a, to: toA, name: "shot.jpg", action: "archive", size: 3, perceptual: { peers: [b], best: true } },
      { from: b, to: toB, name: "shot-2.jpg", action: "archive", size: 3, perceptual: { peers: [a], best: false } },
    ],
    { destDir: dest, sourceDir: src },
  );

  assert.equal(similarReportPath, path.join(dest, ".tidy", "similar.md"));
  const report = fs.readFileSync(similarReportPath, "utf8");
  // The peers were recorded before anything moved. Naming them by their source
  // paths would point the report at files that no longer exist there, which is
  // the one thing it exists to avoid.
  assert.ok(report.includes(path.join("Images", "shot.jpg")));
  assert.ok(report.includes(path.join("Images", "shot-2.jpg")));
  assert.ok(!report.includes(src));
  // Written relative to the archive the report sits in, so the file names stay
  // readable instead of trailing a repeated absolute prefix.
  assert.ok(!report.includes(dest));
  assert.match(report, /largest of the set/);
});

test("a peer already in the destination keeps its path, and a second run appends", () => {
  const src = tmp();
  const dest = tmp();
  // Archived by an earlier run: this one never moves it, so it is already at
  // its final path and must survive the rewrite untouched.
  const archived = write(dest, "Images/old.jpg", "OLD");
  const fresh = write(src, "new.jpg", "NEW");
  const to = path.join(dest, "Images", "new.jpg");

  const run = () =>
    executePlan(
      [
        {
          from: fresh,
          to,
          name: "new.jpg",
          action: "archive",
          size: 3,
          perceptual: { peers: [archived], best: false },
        },
      ],
      { destDir: dest, sourceDir: src },
    );

  const { similarReportPath } = run();
  assert.ok(fs.readFileSync(similarReportPath, "utf8").includes(path.join("Images", "old.jpg")));

  // Put it back so the second run has something to move again.
  fs.renameSync(to, fresh);
  run();
  const blocks = fs.readFileSync(similarReportPath, "utf8").match(/^## /gm);
  assert.equal(blocks.length, 2, "the second run appends a block instead of replacing the first");
});

test("a record that can't be written leaves the run a success", async () => {
  const src = tmp();
  const dest = tmp();
  const a = write(src, "shot.jpg", "AAA");
  const b = write(src, "shot-2.jpg", "BBB");
  write(src, "photo.jpg", "SAME");
  write(src, "photo copy.jpg", "SAME");
  const entries = await plan(src, dest);
  for (const e of entries.filter((e) => e.name.startsWith("shot"))) {
    e.perceptual = { peers: [e.from === a ? b : a], best: e.from === a };
  }
  // A directory standing where each record file belongs: appending fails the
  // way a full or read-only volume would, but only after every move is done.
  fs.mkdirSync(path.join(dest, ".tidy", "similar.md"), { recursive: true });
  fs.mkdirSync(path.join(dest, "Duplicates", "manifest.md"), { recursive: true });

  const { moved, manifestPath, similarReportPath, reportErrors } = executePlan(entries, {
    destDir: dest,
    sourceDir: src,
  });

  // The whole point: the files are archived, so nothing about this run failed.
  assert.equal(moved.length, entries.length);
  for (const e of moved) assert.ok(fs.existsSync(e.to), `${e.name} was moved`);
  assert.ok(fs.existsSync(manifestPath), "the run is still undoable");
  // Never handed out: adapters offer to open this path, and there is no block
  // in it describing this run.
  assert.equal(similarReportPath, null);
  assert.deepEqual(
    reportErrors.map((e) => e.report).sort(),
    ["duplicates", "similar"],
    "both post-move appends are reported",
  );
  for (const e of reportErrors) {
    assert.equal(e.code, "REPORT_WRITE");
    assert.ok(e.path, "adapters name the file that couldn't be written");
  }
});

test("a run with nothing flagged writes no similar report", () => {
  const src = tmp();
  const dest = tmp();
  const from = write(src, "plain.txt", "x");

  const { similarReportPath } = executePlan(
    [{ from, to: path.join(dest, "Documents", "plain.txt"), name: "plain.txt", action: "archive", size: 1 }],
    { destDir: dest, sourceDir: src },
  );
  assert.equal(similarReportPath, null);
  assert.ok(!fs.existsSync(path.join(dest, ".tidy", "similar.md")));
});

test("quarantines a new file that duplicates one already archived in the destination", async () => {
  const src = tmp();
  const dest = tmp();
  const kept = write(dest, `Images/${ym}/x.jpg`, "CONTENT");
  write(src, "y.jpg", "CONTENT");

  const entries = await plan(src, dest);
  assert.equal(entries[0].action, "duplicate");
  assert.equal(entries[0].keeperPath, kept);
});

test("a file that vanishes between the scan and the hashing drops out instead of aborting dedup", async () => {
  const src = tmp();
  write(src, "a.txt", "same");
  write(src, "b.txt", "same");
  // Same size as each other, so they reach the hashing rather than being
  // separated by the size prefilter.
  write(src, "gone.txt", "vanishing");
  write(src, "gone-twin.txt", "vanishing");
  const sourceFiles = scanSource(src);
  // A download finishing mid-run renames its temp file away exactly like this.
  fs.unlinkSync(path.join(src, "gone.txt"));

  const duplicates = await findDuplicates(sourceFiles, []);
  // The intact pair is still judged normally…
  assert.equal(duplicates.size, 1);
  assert.ok(duplicates.has(path.join(src, "b.txt")));
  // …and the survivor of the vanished pair is never called a duplicate of a
  // file that isn't there any more.
  assert.ok(!duplicates.has(path.join(src, "gone-twin.txt")));
});

test("undo restores every file, clears emptied folders, retires the manifest, then returns null", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "aaa");
  write(src, "b.jpg", "bbbb");
  executePlan(await plan(src, dest), { destDir: dest, sourceDir: src });

  const result = undoLastRun(dest);
  assert.equal(result.retired, true);
  assert.equal(result.restored, 2);
  assert.equal(result.failures.length, 0);
  assert.ok(result.removedDirs.length >= 2);
  assert.ok(fs.existsSync(path.join(src, "a.txt")));
  assert.ok(!fs.existsSync(path.join(dest, "Documents")));
  assert.ok(!fs.existsSync(path.join(dest, "Images")));

  assert.equal(undoLastRun(dest), null);
});

test("undo reports occupied when the original spot is taken, and keeps the manifest", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "a.txt", "aaa");
  executePlan(await plan(src, dest), { destDir: dest, sourceDir: src });
  write(src, "a.txt", "different now");

  const result = undoLastRun(dest);
  assert.equal(result.retired, false);
  assert.equal(result.failures[0].code, "occupied");
  assert.ok(fs.existsSync(result.manifestPath)); // not retired, so the undo can be retried
  assert.ok(fs.existsSync(path.join(dest, "Documents", ym, "a.txt")));
});

test("appends a ' (n)' suffix when the target name is already taken", async () => {
  const src = tmp();
  const dest = tmp();
  write(src, "sub1/same.txt", "one");
  write(src, "sub2/same.txt", "two");

  executePlan(await plan(src, dest, { recursive: true }), { destDir: dest, sourceDir: src });
  assert.ok(fs.existsSync(path.join(dest, "Documents", ym, "same.txt")));
  assert.ok(fs.existsSync(path.join(dest, "Documents", ym, "same (1).txt")));
});

test("resolves final names in the plan, so same-named files get successive ' (n)' suffixes", async () => {
  const dest = tmp();
  const bucket = path.join(dest, "Documents", ym);
  fs.mkdirSync(bucket, { recursive: true });
  fs.writeFileSync(path.join(bucket, "report.txt"), "existing");
  const date = new Date();
  const sourceFiles = ["one", "two"].map((folder) => ({
    path: path.join("/source", folder, "report.txt"),
    name: "report.txt",
    ext: "txt",
    size: 1,
    birthtime: date,
    mtime: date,
  }));

  const entries = await buildPlan({
    sourceFiles,
    duplicates: new Map(),
    destDir: dest,
    extIndex,
    fallbackCategory: "Others",
    folderName: (b) => b,
  });
  // The plan already carries the final name, so the preview matches disk
  assert.deepEqual(
    entries.map((e) => path.basename(e.to)),
    ["report (1).txt", "report (2).txt"],
  );
});

test("rejects category and sub-category names that escape the destination", async () => {
  const now2 = new Date();
  const sourceFiles = [{ path: "/source/a.txt", name: "a.txt", ext: "txt", size: 1, birthtime: now2, mtime: now2 }];
  const base = { sourceFiles, duplicates: new Map(), destDir: "/archive", fallbackCategory: "Others" };
  // The code carries the phrasing to the adapters; the raw message is core's own
  const rejected = (label) => (err) => err.code === "INVALID_SEGMENT" && err.label === label;

  await assert.rejects(
    buildPlan({ ...base, extIndex: new Map([["txt", "../../outside"]]), folderName: (b) => b }),
    rejected("category"),
  );
  // The prefix comes from the config too, and is caught on the first folder built
  await assert.rejects(buildPlan({ ...base, extIndex, folderName: (b) => `../${b}` }), rejected("duplicates folder"));
  await assert.rejects(
    buildPlan({
      ...base,
      extIndex,
      folderName: (b) => b,
      subIndex: new Map([["Documents", [{ name: "../escape", test: () => true }]]]),
    }),
    rejected("sub-category"),
  );
});

test("undo removes only the folders the run created, keeping ones that predate it", () => {
  const src = tmp();
  const dest = tmp();
  // An archive folder the user had already created themselves
  const bucket = path.join(dest, "Documents", ym);
  fs.mkdirSync(bucket, { recursive: true });
  const from = write(src, "a.txt", "aaa");

  executePlan([{ from, to: path.join(bucket, "a.txt"), name: "a.txt", action: "archive", size: 3 }], {
    destDir: dest,
    sourceDir: src,
  });
  const result = undoLastRun(dest);

  assert.equal(result.retired, true);
  assert.equal(result.removedDirs.length, 0);
  assert.ok(fs.existsSync(bucket));
  assert.ok(fs.existsSync(path.join(dest, "Documents")));
});

test("gives two runs started in the same millisecond their own manifests", () => {
  const src = tmp();
  const dest = tmp();
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ["2026-07-31T12:00:00.000Z"]));
    }
  };
  try {
    const manifests = ["first.txt", "second.txt"].map((name) => {
      const from = write(src, name, name);
      return executePlan([{ from, to: path.join(dest, name), name, action: "archive", size: name.length }], {
        destDir: dest,
        sourceDir: src,
      }).manifestPath;
    });

    assert.notEqual(manifests[0], manifests[1]);
    assert.equal(fs.readdirSync(path.join(dest, ".tidy", "runs")).filter((f) => f.endsWith(".json")).length, 2);
  } finally {
    globalThis.Date = RealDate;
  }
});

test("reports a corrupt manifest as a structured error with a code", () => {
  const dest = tmp();
  const runsDir = path.join(dest, ".tidy", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(path.join(runsDir, "broken.json"), '{"moves":');

  assert.throws(
    () => getLastRun(dest),
    (err) => err instanceof Error && err.code === "MANIFEST_CORRUPT",
  );
});

test("refuses a manifest whose paths point outside the destination", () => {
  const dest = tmp();
  const src = tmp();
  const runsDir = path.join(dest, ".tidy", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(
    path.join(runsDir, "evil.json"),
    JSON.stringify({
      time: "2026-07-31T12:00:00.000Z",
      sourceDir: src,
      // `to` points outside destDir — undo would otherwise touch unrelated files
      moves: [{ from: path.join(src, "a.txt"), to: path.join(os.tmpdir(), "elsewhere.txt"), action: "archive" }],
    }),
  );

  assert.throws(
    () => getLastRun(dest),
    (err) => err instanceof Error && err.code === "MANIFEST_CORRUPT",
  );
});

test("a .tidy folder symlinked out of the destination is refused, not followed", () => {
  const root = tmp();
  const dest = path.join(root, "Archive");
  const src = path.join(root, "Source");
  const elsewhere = path.join(root, "Elsewhere");
  fs.mkdirSync(dest, { recursive: true });
  fs.mkdirSync(src, { recursive: true });
  fs.mkdirSync(elsewhere, { recursive: true });
  fs.symlinkSync(elsewhere, path.join(dest, ".tidy"));
  write(src, "a.txt", "x");

  const entries = [
    {
      from: path.join(src, "a.txt"),
      to: path.join(dest, "Documents", "a.txt"),
      name: "a.txt",
      action: "archive",
      size: 1,
    },
  ];
  const escapes = (err) => err instanceof Error && err.code === "TIDY_DIR_ESCAPES";
  // Writing the run manifest, reading it back, and undoing all go through it.
  assert.throws(() => executePlan(entries, { destDir: dest, sourceDir: src }), escapes);
  assert.throws(() => getLastRun(dest), escapes);
  assert.equal(fs.existsSync(path.join(elsewhere, "runs")), false);
});

test("refuses a manifest reached through a symlinked runs folder, leaving the foreign file alone", () => {
  const root = tmp();
  const dest = path.join(root, "Archive");
  const src = path.join(root, "Source");
  const elsewhere = path.join(root, "Elsewhere");
  fs.mkdirSync(path.join(dest, ".tidy"), { recursive: true });
  fs.mkdirSync(src, { recursive: true });
  fs.mkdirSync(elsewhere, { recursive: true });
  fs.symlinkSync(elsewhere, path.join(dest, ".tidy", "runs"));
  write(dest, "Documents/victim.txt", "archived earlier");

  const planted = path.join(elsewhere, "planted.json");
  fs.writeFileSync(
    planted,
    JSON.stringify({
      time: "2026-08-04T12:00:00.000Z",
      sourceDir: src,
      // Inside both trees — only the route to the manifest itself is crooked.
      moves: [
        { from: path.join(src, "victim.txt"), to: path.join(dest, "Documents", "victim.txt"), action: "archive" },
      ],
      createdDirs: [],
    }),
  );

  // Refused loudly rather than silently: a redirected runs folder means the
  // destination has been tampered with, which the user needs told.
  assert.throws(
    () => undoRun(dest, path.join(dest, ".tidy", "runs", "planted.json")),
    (err) => err instanceof Error && err.code === "TIDY_DIR_ESCAPES",
  );
  assert.ok(fs.existsSync(path.join(dest, "Documents", "victim.txt"))); // not moved out
  assert.ok(fs.existsSync(planted)); // not renamed to *.undone
});

test("refuses a manifest that reaches outside through a symlinked folder, and touches nothing", () => {
  const root = tmp();
  const dest = path.join(root, "Archive");
  const src = path.join(root, "Source");
  const outside = path.join(root, "Outside");
  fs.mkdirSync(path.join(dest, ".tidy", "runs"), { recursive: true });
  fs.mkdirSync(src, { recursive: true });
  fs.mkdirSync(path.join(outside, "leftover"), { recursive: true });
  fs.writeFileSync(path.join(outside, "secret.txt"), "not part of any tidy run");
  // A folder inside destDir that really lives somewhere else.
  fs.symlinkSync(outside, path.join(dest, "ft_Images"));

  fs.writeFileSync(
    path.join(dest, ".tidy", "runs", "symlinked.json"),
    JSON.stringify({
      time: "2026-08-04T12:00:00.000Z",
      sourceDir: src,
      // Every path here is lexically inside its tree; only the symlink isn't.
      moves: [
        { from: path.join(src, "secret.txt"), to: path.join(dest, "ft_Images", "secret.txt"), action: "archive" },
      ],
      createdDirs: [path.join(dest, "ft_Images", "leftover")],
    }),
  );

  assert.throws(
    () => undoLastRun(dest),
    (err) => err instanceof Error && err.code === "MANIFEST_CORRUPT",
  );
  // The point of the check: nothing outside the trees was restored or removed.
  assert.ok(fs.existsSync(path.join(outside, "secret.txt")));
  assert.ok(!fs.existsSync(path.join(src, "secret.txt")));
  assert.ok(fs.existsSync(path.join(outside, "leftover")));
});

test("does not count a recorded but unperformed move as restored", () => {
  const src = tmp();
  const dest = tmp();
  const runsDir = path.join(dest, ".tidy", "runs");
  fs.mkdirSync(runsDir, { recursive: true });
  const from = write(src, "still-here.txt", "never moved");
  fs.writeFileSync(
    path.join(runsDir, "2026-07-31.json"),
    JSON.stringify({
      time: "2026-07-31T12:00:00.000Z",
      sourceDir: src,
      moves: [{ from, to: path.join(dest, "Documents", ym, "still-here.txt"), action: "archive" }],
      createdDirs: [],
    }),
  );

  const result = undoLastRun(dest);
  assert.equal(result.retired, true);
  assert.equal(result.restored, 0); // nothing was restored: the move never happened
});

test("moves across volumes by copy+verify+unlink, clearing the copy when the source can't be removed", () => {
  const dir = tmp();
  const exdev = () => {
    const e = new Error("cross-device link");
    e.code = "EXDEV";
    throw e;
  };

  const from = write(dir, "a.txt", "cross-volume");
  const mtime = new Date("2024-01-02T03:04:05Z");
  fs.utimesSync(from, new Date(), mtime);
  const to = path.join(dir, "moved.txt");
  moveFile(from, to, exdev);
  assert.equal(fs.existsSync(from), false);
  assert.equal(fs.readFileSync(to, "utf8"), "cross-volume");
  // The copy keeps the source's mtime, same as a same-volume rename would.
  assert.equal(fs.statSync(to).mtime.getTime(), mtime.getTime());

  const keep = write(dir, "b.txt", "keep-source");
  const copy = path.join(dir, "copy.txt");
  assert.throws(
    () =>
      moveFile(keep, copy, exdev, () => {
        const e = new Error("source is busy");
        e.code = "EBUSY";
        throw e;
      }),
    /source is busy/,
  );
  // The source survives and no ghost copy is left behind
  assert.equal(fs.readFileSync(keep, "utf8"), "keep-source");
  assert.equal(fs.existsSync(copy), false);
});

test("isInsideDir and canonicalPath", () => {
  const t = tmp();
  assert.equal(isInsideDir(t, t), true);
  assert.equal(isInsideDir(t, path.join(t, "sub")), true);
  assert.equal(isInsideDir(path.join(t, "sub"), t), false);
  // A path that doesn't exist yet: canonicalize the deepest existing ancestor, re-append the rest
  assert.equal(canonicalPath(path.join(t, "nope", "deep")), path.join(canonicalPath(t), "nope", "deep"));
});
