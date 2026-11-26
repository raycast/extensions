import { describe, expect, it } from "vitest";
import { parseColor } from "../src/lib/color";
import {
  analyze,
  apcaLc,
  apcaMinFont,
  apcaRequiredLc,
  formatRatio,
  isLargeText,
  passesTarget,
  wcagRatio,
} from "../src/lib/contrast";
import { findAllFixes, findFix, primaryFix } from "../src/lib/fixes";
import { toHex } from "../src/lib/color";

const c = (value: string) => parseColor(value)!;

describe("WCAG 2.2", () => {
  it("computes known ratios", () => {
    expect(wcagRatio(c("#000"), c("#fff"))).toBeCloseTo(21, 5);
    expect(wcagRatio(c("#fff"), c("#fff"))).toBeCloseTo(1, 5);
    expect(formatRatio(wcagRatio(c("#aaaaaa"), c("#ffffff")))).toBe("2.32:1");
    expect(formatRatio(wcagRatio(c("#767676"), c("#ffffff")))).toBe("4.54:1");
  });

  it("is symmetric", () => {
    expect(wcagRatio(c("#a2d26b"), c("#1e1e1e"))).toBeCloseTo(wcagRatio(c("#1e1e1e"), c("#a2d26b")), 10);
  });

  it("never rounds a fail up to a pass", () => {
    // #777777 on white is 4.478:1, which must fail AA normal text.
    expect(passesTarget(c("#777777"), c("#ffffff"), "aa", 16, 400)).toBe(false);
  });

  it("detects large text", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(19, 700)).toBe(true);
    expect(isLargeText(19, 600)).toBe(false);
    expect(isLargeText(16, 900)).toBe(false);
  });
});

describe("APCA", () => {
  it("matches the reference values", () => {
    expect(apcaLc(c("#aaaaaa"), c("#ffffff"))).toBeCloseTo(45.83, 1);
    expect(apcaLc(c("#000000"), c("#ffffff"))).toBeCloseTo(106.04, 1);
    expect(apcaLc(c("#ffffff"), c("#000000"))).toBeCloseTo(-107.88, 1);
    expect(apcaLc(c("#a2d26b"), c("#a2d26b"))).toBe(0);
  });

  it("looks up the minimum font size", () => {
    expect(apcaMinFont(45.83, 400)).toEqual({ kind: "size", px: 40 });
    expect(apcaMinFont(20, 400)).toEqual({ kind: "nonText" });
    expect(apcaMinFont(5, 400)).toEqual({ kind: "invisible" });
  });

  it("finds the Lc needed for a font", () => {
    const lc = apcaRequiredLc(16, 400)!;
    expect(lc).toBeGreaterThanOrEqual(85);
    expect(lc).toBeLessThanOrEqual(92);
    expect(apcaRequiredLc(12, 100)).toBeUndefined();
  });
});

describe("analyze", () => {
  it("reports the screenshot example", () => {
    const report = analyze(c("#aaaaaa"), c("#ffffff"), 16, 400);
    expect(report.aa).toBe(false);
    expect(report.levels.aaLarge).toBe(false);
    expect(report.apcaPass).toBe(false);
    expect(report.apcaFont).toEqual({ kind: "size", px: 40 });
  });
});

describe("fixes", () => {
  it("darkens gray text on white to the AA edge", () => {
    const fix = findFix(c("#aaaaaa"), c("#ffffff"), { target: "aa", mode: "foreground", sizePx: 16, weight: 400 })!;
    expect(fix.ratio).toBeGreaterThanOrEqual(4.5);
    expect(fix.ratio).toBeLessThan(4.7);
    expect(toHex(fix.bg)).toBe("#ffffff");
  });

  it("checks the copied hex, not an unrounded color", () => {
    const fix = findFix(c("#aaaaaa"), c("#ffffff"), { target: "aa", mode: "foreground", sizePx: 16, weight: 400 })!;
    expect(toHex(fix.fg)).toBe("#767676");
    expect(passesTarget(c(toHex(fix.fg)), c("#ffffff"), "aa", 16, 400)).toBe(true);
  });

  it("keeps the hue of a brand color", () => {
    const fix = findFix(c("#a2d26b"), c("#ffffff"), { target: "aa", mode: "foreground", sizePx: 16, weight: 400 })!;
    const g = fix.fg.g;
    expect(g).toBeGreaterThan(fix.fg.r);
    expect(g).toBeGreaterThan(fix.fg.b);
  });

  it("fixes identical colors", () => {
    const fixes = findAllFixes(c("#a2d26b"), c("#a2d26b"), 16, 400);
    for (const target of ["aa", "aaa", "apca"] as const) {
      const fix = primaryFix(fixes, target);
      expect(fix, target).toBeDefined();
      expect(passesTarget(fix!.fg, fix!.bg, target, 16, 400)).toBe(true);
    }
  });

  it("returns nothing when the pair already passes", () => {
    expect(findAllFixes(c("#000"), c("#fff"), 16, 400)).toEqual([]);
  });

  it("is fast enough to run on every render", () => {
    const start = performance.now();
    findAllFixes(c("#a2d26b"), c("#a2d26b"), 16, 400);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
