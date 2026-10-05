import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { posterFilename, renderPosterPng, saveNew, SHARE_PIXELS } from "./shareImage.ts";
import { tiersFor } from "./theme.ts";
import { renderSharePoster, SHARE_ASPECT, SHARE_WIDTH, type WrappedFacts } from "./wrappedPoster.ts";

test("posterFilename slugs the period and never comes out empty", () => {
  assert.equal(posterFilename("All Time"), "foqus-recap-all-time.png");
  assert.equal(posterFilename("Q3 2026"), "foqus-recap-q3-2026.png");
  assert.equal(posterFilename("···"), "foqus-recap-recap.png");
});

const blank = async () => undefined;

test("saveNew steps aside instead of overwriting", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "foqus-test-"));
  try {
    await writeFile(path.join(dir, "a.png"), "a backup");
    assert.equal(await saveNew(dir, "a.png", blank), path.join(dir, "a-2.png"));
    assert.equal(
      await saveNew(dir, "a.png", blank),
      path.join(dir, "a-3.png"),
      "the name it returned is already taken",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("two exports at the same moment never share a name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "foqus-test-"));
  try {
    const names = await Promise.all([1, 2, 3].map(() => saveNew(dir, "sessions.json", blank)));
    assert.equal(new Set(names).size, 3);
    assert.deepEqual((await readdir(dir)).sort(), ["sessions-2.json", "sessions-3.json", "sessions.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a save that fails leaves no empty file behind, and the next one gets the name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "foqus-test-"));
  try {
    const broken = async () => {
      throw new Error("QuickLook could not draw the recap");
    };
    await assert.rejects(saveNew(dir, "recap.png", broken), /QuickLook could not draw the recap/);
    assert.deepEqual(await readdir(dir), []);
    assert.equal(await saveNew(dir, "recap.png", blank), path.join(dir, "recap.png"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

const FACTS: WrappedFacts = {
  periodLabel: "All Time",
  totalMinutes: 8_600,
  totalSessions: 214,
  activeDays: 97,
  goals: [{ name: "Deep work", minutes: 4_200 }],
  weeks: [{ start: "2026-01-05", minutes: 900 }],
  weeklyAverage: 1_400,
  longestSession: 240,
  longestSessionWhen: "Jan 9",
  bestDay: 480,
  bestDayWhen: "Jan 24",
  bestStreak: 9,
  bestStreakWhen: "Jan 10 – Jan 18",
};

test("renderSharePoster draws a poster QuickLook can turn into a PNG of the same shape", async (t) => {
  const markup = renderSharePoster(FACTS, tiersFor([600, 1200, 2400]));
  assert.match(markup, new RegExp(`^<svg [^>]*\\bwidth="${SHARE_WIDTH}" height="${SHARE_WIDTH}"`));
  assert.doesNotMatch(markup, /undefined|NaN|\[object Object\]/);

  if (process.platform !== "darwin") return t.skip("QuickLook is macOS only");
  const dir = await mkdtemp(path.join(tmpdir(), "foqus-test-"));
  try {
    const out = await renderPosterPng(markup, path.join(dir, "poster.png"), SHARE_ASPECT);
    const { stdout } = await import("node:child_process").then(({ execFileSync }) => ({
      stdout: execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", out], { encoding: "utf8" }),
    }));
    assert.match(stdout, new RegExp(`pixelWidth: ${SHARE_PIXELS}`));
    assert.match(stdout, new RegExp(`pixelHeight: ${Math.round(SHARE_PIXELS * SHARE_ASPECT)}`));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
