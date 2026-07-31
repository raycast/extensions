import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findDuplicates } from "../src/core/dedup.js";
import { executePlan } from "../src/core/execute.js";
import { buildPlan } from "../src/core/plan.js";
import { undoLastRun } from "../src/core/undo.js";

async function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "file-tidy-test-"));
  try {
    return await run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("detects duplicate empty files", async () => {
  await withTempDir(async (dir) => {
    const first = path.join(dir, "first.txt");
    const second = path.join(dir, "second.txt");
    fs.writeFileSync(first, "");
    fs.writeFileSync(second, "");
    const now = new Date();

    const duplicates = await findDuplicates(
      [
        { path: first, name: "first.txt", ext: "txt", size: 0, birthtime: now, mtime: now },
        { path: second, name: "second.txt", ext: "txt", size: 0, birthtime: now, mtime: now },
      ],
      [],
    );

    assert.equal(duplicates.size, 1);
  });
});

test("rejects category names that escape the destination", async () => {
  const now = new Date("2026-07-01T00:00:00Z");

  await assert.rejects(
    buildPlan({
      sourceFiles: [
        {
          path: "/source/report.txt",
          name: "report.txt",
          ext: "txt",
          size: 1,
          birthtime: now,
          mtime: now,
        },
      ],
      duplicates: new Map(),
      destDir: "/archive",
      extIndex: new Map([["txt", "../../outside"]]),
      fallbackCategory: "Others",
    }),
    /invalid category/i,
  );
});

test("undo keeps destination directories that existed before the run", async () => {
  await withTempDir((dir) => {
    const sourceDir = path.join(dir, "source");
    const destDir = path.join(dir, "destination");
    const bucketDir = path.join(destDir, "Documents", "2026-07");
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(bucketDir, { recursive: true });
    const from = path.join(sourceDir, "report.txt");
    const to = path.join(bucketDir, "report.txt");
    fs.writeFileSync(from, "report");

    executePlan(
      [
        {
          from,
          to,
          name: "report.txt",
          action: "archive",
          category: "Documents",
          yearMonth: "2026-07",
          dateSource: "fs",
          size: 6,
        },
      ],
      { destDir, sourceDir },
    );
    const result = undoLastRun(destDir);

    assert.equal(result?.retired, true);
    assert.equal(fs.existsSync(bucketDir), true);
    assert.equal(fs.existsSync(path.dirname(bucketDir)), true);
  });
});

test("moves files with copy and verification when rename crosses volumes", async () => {
  await withTempDir(async (dir) => {
    const from = path.join(dir, "source.txt");
    const to = path.join(dir, "destination.txt");
    fs.writeFileSync(from, "cross-volume");
    const { moveFile } = await import("../src/core/move.js");

    moveFile(from, to, () => {
      const error = new Error("cross-device link");
      error.code = "EXDEV";
      throw error;
    });

    assert.equal(fs.existsSync(from), false);
    assert.equal(fs.readFileSync(to, "utf8"), "cross-volume");
  });
});

test("removes a cross-volume destination copy when source removal fails", async () => {
  await withTempDir(async (dir) => {
    const from = path.join(dir, "source.txt");
    const to = path.join(dir, "destination.txt");
    fs.writeFileSync(from, "keep-source");
    const { moveFile } = await import("../src/core/move.js");

    assert.throws(
      () =>
        moveFile(
          from,
          to,
          () => {
            const error = new Error("cross-device link");
            error.code = "EXDEV";
            throw error;
          },
          () => {
            const error = new Error("source is busy");
            error.code = "EBUSY";
            throw error;
          },
        ),
      /source is busy/,
    );
    assert.equal(fs.readFileSync(from, "utf8"), "keep-source");
    assert.equal(fs.existsSync(to), false);
  });
});

test("uses a unique manifest for runs started in the same millisecond", async () => {
  await withTempDir((dir) => {
    const sourceDir = path.join(dir, "source");
    const destDir = path.join(dir, "destination");
    fs.mkdirSync(sourceDir);
    const RealDate = globalThis.Date;
    globalThis.Date = class extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : ["2026-07-31T12:00:00.000Z"]));
      }
    };

    try {
      const manifests = ["first.txt", "second.txt"].map((name) => {
        const from = path.join(sourceDir, name);
        fs.writeFileSync(from, name);
        return executePlan([{ from, to: path.join(destDir, name), name, action: "archive", size: name.length }], {
          destDir,
          sourceDir,
        }).manifestPath;
      });

      assert.notEqual(manifests[0], manifests[1]);
      assert.equal(
        fs.readdirSync(path.join(destDir, ".tidy", "runs")).filter((name) => name.endsWith(".json")).length,
        2,
      );
    } finally {
      globalThis.Date = RealDate;
    }
  });
});

test("reports corrupt tidy records with a structured error", async () => {
  await withTempDir(async (dir) => {
    const runsDir = path.join(dir, ".tidy", "runs");
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(path.join(runsDir, "broken.json"), '{"moves":');
    const { getLastRun } = await import("../src/core/undo.js");

    assert.throws(
      () => getLastRun(dir),
      (error) => error instanceof Error && error.code === "MANIFEST_CORRUPT",
    );
  });
});

test("does not count a recorded but unperformed move as restored", async () => {
  await withTempDir((dir) => {
    const sourceDir = path.join(dir, "source");
    const destDir = path.join(dir, "destination");
    const runsDir = path.join(destDir, ".tidy", "runs");
    const from = path.join(sourceDir, "still-here.txt");
    const to = path.join(destDir, "Documents", "2026-07", "still-here.txt");
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(from, "not moved");
    fs.writeFileSync(
      path.join(runsDir, "2026-07-31.json"),
      JSON.stringify({
        time: "2026-07-31T12:00:00.000Z",
        sourceDir,
        moves: [{ from, to, action: "archive" }],
        createdDirs: [],
      }),
    );

    const result = undoLastRun(destDir);

    assert.equal(result?.retired, true);
    assert.equal(result?.restored, 0);
  });
});

test("reserves collision-free destinations in the preview plan", async () => {
  await withTempDir(async (dir) => {
    const destDir = path.join(dir, "destination");
    const bucketDir = path.join(destDir, "Documents", "2026-07");
    fs.mkdirSync(bucketDir, { recursive: true });
    fs.writeFileSync(path.join(bucketDir, "report.txt"), "existing");
    const date = new Date("2026-07-01T00:00:00");
    const sourceFiles = ["one", "two"].map((folder) => ({
      path: path.join(dir, folder, "report.txt"),
      name: "report.txt",
      ext: "txt",
      size: 1,
      birthtime: date,
      mtime: date,
    }));

    const entries = await buildPlan({
      sourceFiles,
      duplicates: new Map(),
      destDir,
      extIndex: new Map([["txt", "Documents"]]),
      fallbackCategory: "Others",
    });

    assert.deepEqual(
      entries.map((entry) => path.basename(entry.to)),
      ["report (1).txt", "report (2).txt"],
    );
  });
});
