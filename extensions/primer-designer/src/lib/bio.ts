import type { PrimerResult } from "../types/primer";

export function cleanSequence(input: string): string {
  return (input || "").replace(/[^ATGC]/gi, "").toUpperCase();
}

export function reverseComplement(seq: string): string {
  const map: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };

  return seq
    .toUpperCase()
    .split("")
    .reverse()
    .map((b) => map[b] ?? "N")
    .join("");
}

export function gcContent(seq: string): number {
  if (!seq.length) return 0;
  const gc = (seq.match(/[GC]/g) || []).length;
  return (gc / seq.length) * 100;
}

/**
 * Wallace rule (rough): Tm ≈ 2*(A+T) + 4*(G+C)
 * Good enough for V1. If you try to turn this into SantaLucia now, you're procrastinating.
 */
export function tmWallace(seq: string): number {
  const s = seq.toUpperCase();
  const at = (s.match(/[AT]/g) || []).length;
  const gc = (s.match(/[GC]/g) || []).length;
  return 2 * at + 4 * gc;
}

export function designPrimers(sequenceRaw: string, primerLengthRaw: number): PrimerResult {
  const clean = cleanSequence(sequenceRaw);

  // Handle empty / too-short input safely
  if (clean.length < 80) {
    return {
      cleanSequence: clean,
      primerLength: 0,
      forward: "",
      reverse: "",
      forwardGC: 0,
      reverseGC: 0,
      forwardTm: 0,
      reverseTm: 0,
    };
  }

  const targetTm = 60;
  const targetAmplicon = 120; // qPCR-friendly
  const minAmplicon = 70;
  const maxAmplicon = 200;

  // Primer length preference from input (clamped to a sensible qPCR range)
  const preferredLen = Math.min(25, Math.max(18, Math.round(primerLengthRaw || 20)));

  // Search around the preferred length rather than scanning the entire range
  const minLen = Math.max(18, preferredLen - 2);
  const maxLen = Math.min(25, preferredLen + 2);

  const scanWindow = Math.min(300, clean.length - maxAmplicon);

  function hasBadHomopolymer(s: string) {
    return /(A{5,}|T{5,}|G{5,}|C{5,})/.test(s);
  }

  function scorePrimer(s: string) {
    const tm = tmWallace(s);
    const gc = gcContent(s);

    let score = 0;
    score += Math.abs(tm - targetTm) * 2;

    if (gc < 40) score += (40 - gc) * 1.5;
    if (gc > 60) score += (gc - 60) * 1.5;

    if (!/[GC]$/.test(s)) score += 5; // 3′ GC clamp
    if (hasBadHomopolymer(s)) score += 30;

    return score;
  }

  let best: {
    forward: string;
    reverse: string;
    amplicon: number;
    score: number;
  } | null = null;

  for (let fStart = 0; fStart < scanWindow; fStart++) {
    for (let fLen = minLen; fLen <= maxLen; fLen++) {
      const f = clean.slice(fStart, fStart + fLen);
      if (f.length < minLen) continue;

      const fTm = tmWallace(f);
      if (fTm < 55 || fTm > 65) continue;

      // Look downstream for reverse primer binding sites
      for (let rStart = fStart + minAmplicon; rStart <= fStart + maxAmplicon; rStart++) {
        if (rStart + minLen > clean.length) break;

        for (let rLen = minLen; rLen <= maxLen; rLen++) {
          const rBind = clean.slice(rStart, rStart + rLen);
          if (rBind.length < minLen) continue;

          const r = reverseComplement(rBind);
          const rTm = tmWallace(r);
          if (rTm < 55 || rTm > 65) continue;

          const deltaTm = Math.abs(fTm - rTm);
          if (deltaTm > 2) continue;

          const amplicon = rStart + rLen - fStart;
          if (amplicon < minAmplicon || amplicon > maxAmplicon) continue;

          const score = scorePrimer(f) + scorePrimer(r) + deltaTm * 5 + Math.abs(amplicon - targetAmplicon) * 0.2;

          if (!best || score < best.score) {
            best = { forward: f, reverse: r, amplicon, score };
          }
        }
      }
    }
  }

  // Graceful fallback (should almost never trigger now)
  if (!best) {
    const fallbackLen = Math.min(20, clean.length);
    const forward = clean.slice(0, fallbackLen);
    const reverse = reverseComplement(clean.slice(-fallbackLen));

    return {
      cleanSequence: clean,
      primerLength: fallbackLen,
      forward,
      reverse,
      forwardGC: gcContent(forward),
      reverseGC: gcContent(reverse),
      forwardTm: tmWallace(forward),
      reverseTm: tmWallace(reverse),
    };
  }

  return {
    cleanSequence: clean,
    primerLength: best.forward.length,
    forward: best.forward,
    reverse: best.reverse,
    forwardGC: gcContent(best.forward),
    reverseGC: gcContent(best.reverse),
    forwardTm: tmWallace(best.forward),
    reverseTm: tmWallace(best.reverse),
  };
}
