import { PARAGRAPH_BREAK } from "./tokenize";

export type ParagraphPause = "none" | "short" | "long";

export interface TimingOptions {
  wpm: number;
  paragraphPause: ParagraphPause;
}

export function baseDelayMs(wpm: number): number {
  return 60000 / Math.max(50, wpm);
}

/**
 * Per-word display duration in ms. Variable: punctuation and long words get longer holds.
 * Adapted from aaronpowell/speed-reader (MIT).
 */
export function wordDelayMs(word: string, opts: TimingOptions): number {
  const base = baseDelayMs(opts.wpm);

  if (word === PARAGRAPH_BREAK) {
    if (opts.paragraphPause === "none") return 0;
    if (opts.paragraphPause === "long") return base * 1.5;
    return base * 0.75;
  }

  if (/[.!?]["')\]]*$/.test(word)) return base * 2;
  if (/[,;:]$/.test(word)) return base * 1.5;
  if (word.length > 8) return base * 1.2;
  return base;
}
