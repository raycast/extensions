import type { Color, Pattern, PatternCode } from "./types";

const A_CODE = 97;

const GRAY = 0;
const YELLOW = 1;
const GREEN = 2;

const COLOR_FROM_INT: readonly Color[] = ["gray", "yellow", "green"];
const INT_FROM_COLOR: Record<Color, number> = { gray: GRAY, yellow: YELLOW, green: GREEN };

const EMOJI_FROM_INT: readonly string[] = ["⬜", "🟨", "🟩"];

export const ALL_GREEN_CODE: PatternCode = 2 + 3 * (2 + 3 * (2 + 3 * (2 + 3 * 2)));

export function computePatternCode(guess: string, answer: string): PatternCode {
  const answerLeft = new Uint8Array(26);
  for (let i = 0; i < 5; i++) answerLeft[answer.charCodeAt(i) - A_CODE]++;

  const colors = [GRAY, GRAY, GRAY, GRAY, GRAY];

  for (let i = 0; i < 5; i++) {
    const gc = guess.charCodeAt(i);
    if (gc === answer.charCodeAt(i)) {
      colors[i] = GREEN;
      answerLeft[gc - A_CODE]--;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (colors[i] !== GREEN) {
      const ci = guess.charCodeAt(i) - A_CODE;
      if (answerLeft[ci] > 0) {
        colors[i] = YELLOW;
        answerLeft[ci]--;
      }
    }
  }

  return ((colors[0] * 3 + colors[1]) * 3 + colors[2]) * 3 * 3 + colors[3] * 3 + colors[4];
}

export function computePattern(guess: string, answer: string): Pattern {
  return decodePattern(computePatternCode(guess, answer));
}

export function encodePattern(p: Pattern): PatternCode {
  let code = 0;
  for (let i = 0; i < 5; i++) code = code * 3 + INT_FROM_COLOR[p[i]];
  return code;
}

export function decodePattern(code: PatternCode): Pattern {
  const out: Color[] = new Array(5);
  for (let i = 4; i >= 0; i--) {
    out[i] = COLOR_FROM_INT[code % 3];
    code = Math.floor(code / 3);
  }
  return out as unknown as Pattern;
}

export function patternToEmoji(p: Pattern): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += EMOJI_FROM_INT[INT_FROM_COLOR[p[i]]];
  return s;
}

export function patternCodeToKey(code: PatternCode): string {
  let s = "";
  let c = code;
  const digits: number[] = new Array(5);
  for (let i = 4; i >= 0; i--) {
    digits[i] = c % 3;
    c = Math.floor(c / 3);
  }
  for (let i = 0; i < 5; i++) s += digits[i].toString();
  return s;
}
