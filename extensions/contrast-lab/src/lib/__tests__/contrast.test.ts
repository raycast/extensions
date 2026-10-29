// Fixture tests for the verified contrast core. Expected values were computed
// against culori@4.0.2, apca-w3@0.1.9, colorparsley@0.1.8 and MUST NOT be edited
// to make a test pass — a mismatch means a dependency version drifted.
//
// Tolerances (per spec): WCAG ratio +/-0.02, APCA Lc +/-0.1.

import { test } from "node:test";
import assert from "node:assert/strict";

import { analyze } from "../contrast";
import { minFontSize } from "../apca";
import { rawRatio } from "../wcag";

const WCAG_TOL = 0.02;
const LC_TOL = 0.1;

const closeTo = (actual: number, expected: number, tol: number, label: string): void => {
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: expected ${expected} +/-${tol}, got ${actual}`);
};

// --- WCAG ratio --------------------------------------------------------------

const WCAG_FIXTURES: Array<[string, string, number]> = [
  ["#000000", "#ffffff", 21.0],
  ["#777777", "#ffffff", 4.48],
  ["#ffa500", "#ffffff", 1.97],
  ["#1d4ed8", "#ffffff", 6.7],
  ["oklch(0.6 0.2 25)", "#ffffff", 4.36],
];

for (const [fg, bg, expected] of WCAG_FIXTURES) {
  test(`WCAG ratio ${fg} on ${bg} = ${expected}`, () => {
    const { wcag } = analyze({ foreground: fg, background: bg });
    closeTo(wcag.ratio, expected, WCAG_TOL, `ratio ${fg}/${bg}`);
  });
}

test("WCAG levels: #000 on #fff passes everything; #ffa500 on #fff fails all", () => {
  const black = analyze({ foreground: "#000000", background: "#ffffff" }).wcag;
  assert.deepEqual(
    { aaN: black.aaNormal, aaL: black.aaLarge, aaaN: black.aaaNormal, aaaL: black.aaaLarge },
    { aaN: true, aaL: true, aaaN: true, aaaL: true },
  );

  const orange = analyze({ foreground: "#ffa500", background: "#ffffff" }).wcag;
  assert.deepEqual(
    { aaN: orange.aaNormal, aaL: orange.aaLarge, aaaN: orange.aaaNormal, aaaL: orange.aaaLarge },
    { aaN: false, aaL: false, aaaN: false, aaaL: false },
  );
});

test("WCAG levels compare the RAW ratio: #6e7978 on #fff rounds to 4.50 but fails AA", () => {
  // Raw ratio is 4.4976; it rounds to 4.50 for display but must NOT count as AA-passing.
  const { wcag } = analyze({ foreground: "#6e7978", background: "#ffffff" });
  assert.equal(wcag.ratio, 4.5); // display value rounds up
  assert.equal(wcag.aaNormal, false); // raw 4.4976 < 4.5
  assert.equal(wcag.aaLarge, true); // raw >= 3
});

// --- APCA Lc (signed) --------------------------------------------------------

const APCA_FIXTURES: Array<[string, string, number]> = [
  ["#000000", "#ffffff", 106.04],
  ["#ffffff", "#000000", -107.88],
  ["#777777", "#ffffff", 71.11],
  ["#ffa500", "#ffffff", 37.69],
  ["#1d4ed8", "#ffffff", 82.17],
];

for (const [fg, bg, expected] of APCA_FIXTURES) {
  test(`APCA Lc ${fg} on ${bg} = ${expected}`, () => {
    const { apca } = analyze({ foreground: fg, background: bg });
    closeTo(apca.lc, expected, LC_TOL, `Lc ${fg}/${bg}`);
    closeTo(apca.absLc, Math.abs(expected), LC_TOL, `absLc ${fg}/${bg}`);
  });
}

// --- Nearest passing (target WCAG AA = 4.5) ----------------------------------

test("nearest passing: #ffa500 on #fff returns a real, different amber whose rounded hex clears 4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#ffa500", background: "#ffffff" });
  assert.equal(fixForWcagAA.alreadyPasses, false);
  assert.match(fixForWcagAA.hex, /^#[0-9a-f]{6}$/);
  assert.notEqual(fixForWcagAA.hex.toLowerCase(), "#ffa500");
  assert.ok(rawRatio(fixForWcagAA.hex, "#ffffff") >= 4.5, `returned hex ${fixForWcagAA.hex} must clear 4.5`);
});

test("nearest passing: #1d4ed8 on dark #0a0a0a lightens to #376efa whose rounded hex clears 4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#1d4ed8", background: "#0a0a0a" });
  assert.equal(fixForWcagAA.hex, "#376efa");
  assert.equal(fixForWcagAA.alreadyPasses, false);
  closeTo(fixForWcagAA.ratio, 4.5, WCAG_TOL, "fix ratio #1d4ed8/#0a0a0a");
  assert.ok(rawRatio(fixForWcagAA.hex, "#0a0a0a") >= 4.5, `returned hex ${fixForWcagAA.hex} must clear 4.5`);
});

test("nearest passing: #777777 on #fff returns a real, different hex that clears 4.5 after rounding", () => {
  const { fixForWcagAA } = analyze({ foreground: "#777777", background: "#ffffff" });
  assert.equal(fixForWcagAA.alreadyPasses, false);
  assert.match(fixForWcagAA.hex, /^#[0-9a-f]{6}$/);
  // The returned hex itself must clear AA after 8-bit rounding, not just the continuous candidate.
  assert.ok(rawRatio(fixForWcagAA.hex, "#ffffff") >= 4.5, `returned hex ${fixForWcagAA.hex} must clear 4.5`);
  // #777777 sits at 4.48; the real one-step-darker fix must differ from the input.
  assert.notEqual(fixForWcagAA.hex.toLowerCase(), "#777777");
});

test("nearest passing: #000000 on #fff already passes (alreadyPasses, no change needed)", () => {
  const { fixForWcagAA } = analyze({ foreground: "#000000", background: "#ffffff" });
  assert.equal(fixForWcagAA.alreadyPasses, true);
  assert.match(fixForWcagAA.hex, /^#[0-9a-f]{6}$/);
  assert.notEqual(fixForWcagAA.hex, "");
});

test("nearest passing: #ffff00 on #fff returns a real fix (dark olive) whose hex clears 4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#ffff00", background: "#ffffff" });
  assert.equal(fixForWcagAA.alreadyPasses, false);
  assert.notEqual(fixForWcagAA.hex.toLowerCase(), "#ffff00");
  assert.ok(rawRatio(fixForWcagAA.hex, "#ffffff") >= 4.5, `fix ${fixForWcagAA.hex} must clear 4.5`);
});

// --- APCA font-size threshold sanity -----------------------------------------

test("APCA font threshold: absLc 75, weight 400 -> minFontPx 18 (pass@18, fail@14)", () => {
  const min = minFontSize(75, 400);
  assert.equal(min, 18);
  assert.equal(18 >= (min ?? Infinity), true);
  assert.equal(14 >= (min ?? Infinity), false);
});

test("APCA font threshold: absLc 75, weight 700 -> minFontPx 14", () => {
  assert.equal(minFontSize(75, 700), 14);
});

test("APCA font threshold: absLc 20 -> sentinel, minFontPx null for every weight", () => {
  for (const w of [100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
    assert.equal(minFontSize(20, w), null, `weight ${w} should be unusable at Lc 20`);
  }
});

test("APCA passesAtSize wiring: black on white at 16px/400 is usable", () => {
  const { apca } = analyze({ foreground: "#000000", background: "#ffffff" });
  assert.notEqual(apca.minFontPx, null);
  assert.equal(apca.passesAtSize, true);
});

// --- Input handling ----------------------------------------------------------

test("defaults: fontSizePx 16 and fontWeight 400 when omitted", () => {
  const { input } = analyze({ foreground: "#000", background: "#fff" });
  assert.equal(input.fontSizePx, 16);
  assert.equal(input.fontWeight, 400);
});

test("accepts hex/rgb/hsl/oklch foreground forms against white", () => {
  for (const fg of ["#000", "#000000ff", "rgb(0,0,0)", "hsl(0 0% 0%)", "oklch(0 0 0)"]) {
    const result = analyze({ foreground: fg, background: "#ffffff" });
    assert.ok(result.valid, `${fg} should be valid`);
    closeTo(result.wcag.ratio, 21, WCAG_TOL, `ratio ${fg}/#fff`);
  }
});

test("invalid color: valid=false, helpful error, zeroed sub-results", () => {
  const result = analyze({ foreground: "not-a-color", background: "#fff" });
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /foreground/);
  assert.equal(result.wcag.ratio, 0);
  assert.equal(result.apca.lc, 0);
  assert.equal(result.fixForWcagAA.hex, "");
});

// --- Translucent compositing -------------------------------------------------

test("translucent fg is composited over the bg before scoring: rgba(0,0,0,0.5) on #fff", () => {
  const result = analyze({ foreground: "rgba(0,0,0,0.5)", background: "#ffffff" });
  assert.equal(result.valid, true);
  assert.equal(result.resolved.foreground, "#808080"); // 50% black over white
  // ~3.98, NOT ~21 (which is what scoring it as opaque black would give).
  assert.ok(result.wcag.ratio > 3.9 && result.wcag.ratio < 4.05, `expected ~3.98, got ${result.wcag.ratio}`);
  assert.equal(result.wcag.aaNormal, false);
  assert.equal(result.wcag.aaLarge, true);
});

test("translucent hex (#00000080) is composited, not treated as opaque black", () => {
  const { wcag } = analyze({ foreground: "#00000080", background: "#ffffff" });
  // 8-digit `80` alpha is 0.502, so it lands one step off #808080; just prove it composited.
  assert.ok(wcag.ratio < 5, `expected a composited ratio < 5, got ${wcag.ratio}`);
});

// --- Invalid font sizes ------------------------------------------------------

test("invalid font sizes (<=0, non-finite) fall back to the default 16", () => {
  for (const bad of [-5, 0, Infinity]) {
    const { input } = analyze({ foreground: "#000000", background: "#ffffff", fontSizePx: bad });
    assert.equal(input.fontSizePx, 16, `fontSizePx ${bad} should fall back to 16`);
  }
});
