import { RGB, fromOklch, toHex, toOklch } from "./color";
import { FixTarget, FontWeight, apcaLc, passesTarget, wcagRatio } from "./contrast";

/** Which side of the pair the fix changes. */
export type FixMode = "foreground" | "background" | "both";

export type Fix = {
  target: FixTarget;
  mode: FixMode;
  fg: RGB;
  bg: RGB;
  ratio: number;
  lc: number;
  /** How far the lightness moved, in OKLCH L (0–1). Smaller = closer to the original design. */
  shift: number;
};

export const FIX_MODES: FixMode[] = ["foreground", "background", "both"];
export const FIX_TARGETS: FixTarget[] = ["aa", "aaa", "apca"];

const STEP = 0.0025;

type Options = { target: FixTarget; mode: FixMode; sizePx: number; weight: FontWeight };

/**
 * Finds the smallest OKLCH lightness change that makes the pair pass the target.
 * Hue and chroma stay the same (chroma only drops when the color would leave the sRGB gamut),
 * so the fix still looks like the brand color. Returns `undefined` if no lightness change is enough.
 */
export function findFix(fg: RGB, bg: RGB, { target, mode, sizePx, weight }: Options): Fix | undefined {
  if (passesTarget(fg, bg, target, sizePx, weight)) return undefined;

  const fgLch = toOklch(fg);
  const bgLch = toOklch(bg);
  // Move the changed color away from the other one first: that direction usually needs the smallest change.
  const fgDirection = fgLch.l >= bgLch.l ? 1 : -1;

  const candidates: Fix[] = [];
  for (const direction of [fgDirection, -fgDirection]) {
    for (let shift = STEP; shift <= 1 + STEP; shift += STEP) {
      const fgL = mode === "background" ? fgLch.l : fgLch.l + direction * shift;
      const bgL = mode === "foreground" ? bgLch.l : bgLch.l - direction * shift;
      const moved = mode === "foreground" ? [fgL] : mode === "background" ? [bgL] : [fgL, bgL];
      if (moved.every(outOfRange)) break;

      const nextFg = mode === "background" ? fg : fromOklch(fgL, fgLch.c, fgLch.h);
      const nextBg = mode === "foreground" ? bg : fromOklch(bgL, bgLch.c, bgLch.h);
      if (passesTarget(nextFg, nextBg, target, sizePx, weight)) {
        candidates.push({
          target,
          mode,
          fg: nextFg,
          bg: nextBg,
          ratio: wcagRatio(nextFg, nextBg),
          lc: apcaLc(nextFg, nextBg),
          shift,
        });
        break;
      }
    }
  }

  candidates.sort((a, b) => a.shift - b.shift);
  return candidates[0];
}

function outOfRange(l: number): boolean {
  return l < -STEP || l > 1 + STEP;
}

/** All fixes for all targets and modes, without duplicates. */
export function findAllFixes(fg: RGB, bg: RGB, sizePx: number, weight: FontWeight): Fix[] {
  const seen = new Set<string>();
  const fixes: Fix[] = [];
  for (const target of FIX_TARGETS) {
    for (const mode of FIX_MODES) {
      const fix = findFix(fg, bg, { target, mode, sizePx, weight });
      if (!fix) continue;
      const key = `${target}:${toHex(fix.fg)}:${toHex(fix.bg)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fixes.push(fix);
    }
  }
  return fixes;
}

/** The main fix: change the text color first, then the background, then both. */
export function primaryFix(fixes: Fix[], target: FixTarget): Fix | undefined {
  const forTarget = fixes.filter((fix) => fix.target === target);
  return FIX_MODES.map((mode) => forTarget.find((fix) => fix.mode === mode)).find(Boolean);
}
