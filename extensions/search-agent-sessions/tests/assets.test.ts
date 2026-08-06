import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// __dirname is .build/tests at run time, so this climbs out of the build dir.
const ASSETS = join(__dirname, "..", "..", "assets");

function read(name: string): string {
  return readFileSync(join(ASSETS, name), "utf8");
}

/** Matched literally: the badge has to be identical across all three marks. */
const LIVE_DOT = '<circle cx="242" cy="240" r="38" fill="#34C759"/>';

/**
 * Each live icon duplicates a brand mark's path data, so a viewBox or artwork
 * edit applied to the base alone would leave the two silently out of step —
 * and a wrong-sized icon is exactly the kind of drift nothing else catches.
 * The third field is the only other thing a variant may add: the fill standing
 * in for the tint that compositing the dot into the mark rules out.
 */
for (const [base, live, fill] of [
  ["claude.svg", "claude-live.svg", null],
  ["codex.svg", "codex-live-light.svg", ' fill="#000000"'],
  ["codex.svg", "codex-live-dark.svg", ' fill="#FFFFFF"'],
] as const) {
  test(`${live} is ${base} plus the live dot`, () => {
    const svg = read(live);
    assert.ok(svg.includes(LIVE_DOT), `${live} lost its dot`);

    let stripped = svg.replace(LIVE_DOT, "");
    if (fill) {
      assert.ok(svg.includes(fill), `${live} is not filled ${fill.trim()}`);
      stripped = stripped.replace(fill, "");
    }
    assert.equal(stripped, read(base), `${live} drifted from ${base}`);
  });
}
