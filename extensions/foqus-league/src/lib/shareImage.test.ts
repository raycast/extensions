import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { freePath, posterFilename, renderPosterPng, SHARE_PIXELS } from "./shareImage.ts";
import { tiersFor } from "./theme.ts";
import { renderSharePoster, SHARE_ASPECT, SHARE_WIDTH, type WrappedFacts } from "./wrappedPoster.ts";

test("posterFilename slugs the period and never comes out empty", () => {
  assert.equal(posterFilename("All Time"), "foqus-recap-all-time.png");
  assert.equal(posterFilename("Q3 2026"), "foqus-recap-q3-2026.png");
  assert.equal(posterFilename("···"), "foqus-recap-recap.png");
});

test("freePath steps aside instead of overwriting", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "foqus-test-"));
  try {
    assert.equal(await freePath(dir, "a.png"), path.join(dir, "a.png"));
    await writeFile(path.join(dir, "a.png"), "");
    assert.equal(await freePath(dir, "a.png"), path.join(dir, "a-2.png"));
    await writeFile(path.join(dir, "a-2.png"), "");
    assert.equal(await freePath(dir, "a.png"), path.join(dir, "a-3.png"));
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
