#!/usr/bin/env node
// =============================================================================
// STORE PREFLIGHT
// Hard-fails a publish that would be rejected by Raycast's review.
// -----------------------------------------------------------------------------
// Context: `ray lint` validates the manifest and icon, and `store:check` covers
//   build/typecheck/unit tests — but nothing checked the assets and changelog
//   that actually get an extension bounced, nor that the hardware suites (which
//   CI cannot run) were exercised. This is that gate.
// NOTE: Runs from `npm run publish`, before the store PR is opened. The hardware
//   prompt is skipped when stdin is not a TTY (so CI/scripted runs don't hang);
//   set PREFLIGHT_YES=1 to skip it deliberately.
// =============================================================================

const { execFileSync } = require("node:child_process");
const { existsSync, readdirSync, readFileSync } = require("node:fs");
const { createInterface } = require("node:readline");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const SHOT_WIDTH = 2000;
const SHOT_HEIGHT = 1250;
const MIN_SHOTS = 3;
const MAX_SHOTS = 6;
const ICON_SIZE = 512;

const problems = [];

function ok(message) {
  console.log(`  ok    ${message}`);
}

function fail(message) {
  console.log(`  FAIL  ${message}`);
  problems.push(message);
}

/**
 * Reads a PNG's pixel dimensions via sips.
 *
 * @param {string} path - Absolute path to the image.
 * @returns {{width: number, height: number} | null} Dimensions, or null.
 */
function pngSize(path) {
  try {
    const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const width = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
    return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * Asks a yes/no question, defaulting to no.
 *
 * @param {string} question - The prompt text.
 * @returns {Promise<boolean>} True only on an explicit yes.
 */
function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

// -----------------------------------------------------------
// CHECKS
// -----------------------------------------------------------

function checkIcon() {
  const path = join(ROOT, "assets", "extension-icon.png");
  if (!existsSync(path)) {
    return fail("assets/extension-icon.png is missing");
  }
  const size = pngSize(path);
  if (size === null) {
    return fail("assets/extension-icon.png is not a readable PNG");
  }
  if (size.width !== ICON_SIZE || size.height !== ICON_SIZE) {
    return fail(`icon must be ${ICON_SIZE}x${ICON_SIZE}, found ${size.width}x${size.height}`);
  }
  ok(`icon ${ICON_SIZE}x${ICON_SIZE}`);
}

function checkScreenshots() {
  const dir = join(ROOT, "metadata");
  if (!existsSync(dir)) {
    return fail("metadata/ is missing (store screenshots live there)");
  }
  const shots = readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".png"));
  if (shots.length < MIN_SHOTS) {
    fail(`need at least ${MIN_SHOTS} screenshots, found ${shots.length}`);
  }
  if (shots.length > MAX_SHOTS) {
    fail(`at most ${MAX_SHOTS} screenshots allowed, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = pngSize(join(dir, name));
    if (size === null) {
      fail(`metadata/${name} is not a readable PNG`);
    } else if (size.width !== SHOT_WIDTH || size.height !== SHOT_HEIGHT) {
      fail(`metadata/${name} must be ${SHOT_WIDTH}x${SHOT_HEIGHT}, found ${size.width}x${size.height}`);
    }
  }
  if (shots.length >= MIN_SHOTS && shots.length <= MAX_SHOTS && problems.length === 0) {
    ok(`${shots.length} screenshots @ ${SHOT_WIDTH}x${SHOT_HEIGHT}`);
  }
}

function checkChangelog() {
  const path = join(ROOT, "CHANGELOG.md");
  if (!existsSync(path)) {
    return fail("CHANGELOG.md is missing");
  }
  const text = readFileSync(path, "utf8");
  // Raycast fills {PR_MERGE_DATE} on merge; an entry without it is either
  // already-released or hand-dated, so a new submission needs one.
  if (!/^##\s+\[.+\]\s+-\s+\{PR_MERGE_DATE\}\s*$/m.test(text)) {
    return fail("CHANGELOG.md needs an entry like `## [Title] - {PR_MERGE_DATE}`");
  }
  ok("CHANGELOG has a {PR_MERGE_DATE} entry");
}

function checkGitClean() {
  try {
    const out = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
    if (out.trim() !== "") {
      return fail("working tree is dirty — commit before publishing");
    }
    ok("working tree is clean");
  } catch {
    fail("could not read git status");
  }
}

// -----------------------------------------------------------
// MAIN
// -----------------------------------------------------------

async function main() {
  console.log("\nStore preflight\n");
  checkIcon();
  checkScreenshots();
  checkChangelog();
  checkGitClean();

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s) — not publishing.\n`);
    process.exit(1);
  }

  // CI cannot run the hardware suites, so this is the only place they are
  // enforced at all. Non-interactive runs skip it rather than hang.
  const skip = process.env.PREFLIGHT_YES === "1" || !process.stdin.isTTY;
  if (skip) {
    console.log("  skip  hardware confirmation (non-interactive)");
  } else {
    const confirmed = await confirm(
      "\n  npm run test:hardware passed, on BOTH engines, since the last change? [y/N] ",
    );
    if (!confirmed) {
      console.error("\nRun `npm run test:hardware` (and test the Native engine by hand) first.\n");
      process.exit(1);
    }
    ok("hardware suites confirmed");
  }

  console.log("\nReady to publish.\n");
}

main().catch((error) => {
  console.error("preflight failed:", error.message);
  process.exit(1);
});
