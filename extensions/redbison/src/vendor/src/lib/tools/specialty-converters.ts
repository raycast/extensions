/**
 * Pure logic for the specialty converter pages (the converters plan): military time, numbers to words, text/binary, colors,
 * paper sizes and ring sizes. Pinned by src/test/tools/specialty-converters.test.ts
 * and reused verbatim by their MCP specs.
 */
import { msg } from '../msg';

// ---------------------------------------------------------------------------
// Military (24-hour) time
// ---------------------------------------------------------------------------

export type MilitaryParse = { ok: true; h: number; m: number } | { ok: false; error: string };

/**
 * Narrowing helper. This project compiles with `strict: false`, so TypeScript
 * cannot narrow `parse.ok` to the failure member on its own; call this instead.
 */
export function isMilitaryParseError(p: MilitaryParse): p is { ok: false; error: string } {
  return !p.ok;
}

/** Accepts 0930, 09:30, 930, 1745; 2400 is rejected (use 0000). */
export function parseMilitary(text: string): MilitaryParse {
  const t = text.trim().replace(/[:\s]/g, '');
  if (!/^\d{3,4}$/.test(t)) return { ok: false, error: msg('Enter a time like 0930 or 17:45.') };
  const h = parseInt(t.length === 3 ? t.slice(0, 1) : t.slice(0, 2), 10);
  const m = parseInt(t.slice(-2), 10);
  if (h > 23) return { ok: false, error: msg('Hours run 00 to 23; midnight is 0000.') };
  if (m > 59) return { ok: false, error: msg('Minutes run 00 to 59.') };
  return { ok: true, h, m };
}

/** Accepts "2:30 PM", "2.30pm", "12 am", "2pm". */
export function parseCivilian(text: string): MilitaryParse {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/);
  if (!m) return { ok: false, error: msg('Enter a time like 2:30 PM or 11 AM.') };
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const pm = m[3].startsWith('p');
  if (h < 1 || h > 12) return { ok: false, error: msg('Clock hours run 1 to 12.') };
  if (min > 59) return { ok: false, error: msg('Minutes run 00 to 59.') };
  if (h === 12) h = 0;
  if (pm) h += 12;
  return { ok: true, h, m: min };
}

export const toMilitary = (h: number, m: number): string => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;

export const toCivilian = (h: number, m: number): string => {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** How the hour is read aloud in military usage ("zero nine thirty", "seventeen hundred"). */
export function militarySpoken(h: number, m: number): string {
  const hourWords = ['zero zero', 'zero one', 'zero two', 'zero three', 'zero four', 'zero five', 'zero six', 'zero seven', 'zero eight', 'zero nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three'];
  if (m === 0) return `${hourWords[h]} hundred`;
  const minutePart = m < 10 ? `zero ${numberToWords(m)}` : numberToWords(m);
  return `${hourWords[h]} ${minutePart}`;
}

// ---------------------------------------------------------------------------
// Numbers to words (US English, short scale)
// ---------------------------------------------------------------------------

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
];

function threeDigits(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[Math.floor(n / 10)]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

/** Whole part in words; handles negatives and up to 999.999... trillion. */
export function numberToWords(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1e15) return '';
  const negative = value < 0;
  let n = Math.floor(Math.abs(value));
  if (n === 0) return negative ? 'negative zero' : 'zero';
  const parts: string[] = [];
  for (const [size, name] of SCALES) {
    if (n >= size) {
      parts.push(`${threeDigits(Math.floor(n / size))} ${name}`);
      n %= size;
    }
  }
  if (n > 0) parts.push(threeDigits(n));
  return (negative ? 'negative ' : '') + parts.join(' ');
}

/** "123.45" -> "one hundred twenty-three point four five" (digits after the point are read out). */
export function decimalToWords(text: string): string {
  const m = text.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) return '';
  // The sign is carried separately: parseInt('-0') is -0, which reads as positive.
  const whole = (m[1] ? 'negative ' : '') + numberToWords(parseInt(m[2], 10));
  if (!m[3]) return whole;
  const digits = m[3].split('').map((d) => ONES[parseInt(d, 10)]).join(' ');
  return `${whole} point ${digits}`;
}

/** Check-writing style: "one hundred twenty-three and 45/100 dollars". */
export function amountToCheckWords(text: string): string {
  const m = text.trim().match(/^(-?)\$?\s*([\d,]+)(?:\.(\d{1,2}))?$/);
  if (!m) return '';
  const whole = parseInt(m[2].replace(/,/g, ''), 10);
  if (!Number.isFinite(whole) || whole >= 1e15) return '';
  const cents = (m[3] ?? '0').padEnd(2, '0');
  return `${m[1] ? 'negative ' : ''}${numberToWords(whole)} and ${cents}/100 dollars`;
}

/** 1st, 2nd, 3rd... as words: "first", "twenty-second". */
export function ordinalToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e15) return '';
  const irregular: Record<string, string> = {
    one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth',
  };
  const words = numberToWords(n);
  const lastWord = words.split(/[\s-]/).pop()!;
  if (irregular[lastWord]) return words.slice(0, words.length - lastWord.length) + irregular[lastWord];
  if (lastWord.endsWith('y')) return words.slice(0, -1) + 'ieth';
  return `${words}th`;
}

// ---------------------------------------------------------------------------
// Text <-> binary / hex (UTF-8)
// ---------------------------------------------------------------------------

export function textToBinary(text: string, sep = ' '): string {
  return [...new TextEncoder().encode(text)].map((b) => b.toString(2).padStart(8, '0')).join(sep);
}

export function textToHex(text: string, sep = ' '): string {
  return [...new TextEncoder().encode(text)].map((b) => b.toString(16).padStart(2, '0')).join(sep);
}

export type DecodeResult = { ok: true; text: string } | { ok: false; error: string };

/** Narrowing helper; see isMilitaryParseError for why a guard is needed here. */
export function isDecodeError(r: DecodeResult): r is { ok: false; error: string } {
  return !r.ok;
}

export function binaryToText(bin: string): DecodeResult {
  const clean = bin.trim().replace(/[\s,]+/g, '');
  if (!clean) return { ok: true, text: '' };
  if (!/^[01]+$/.test(clean)) return { ok: false, error: msg('Only 0, 1, spaces and commas are allowed.') };
  if (clean.length % 8 !== 0) return { ok: false, error: msg('Binary text comes in 8-bit bytes; the length must divide by 8.') };
  const bytes = new Uint8Array(clean.length / 8);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: msg('These bytes are not valid UTF-8 text.') };
  }
}

export function hexToTextBytes(hex: string): DecodeResult {
  const clean = hex.trim().replace(/^0x/i, '').replace(/[\s,]+/g, '');
  if (!clean) return { ok: true, text: '' };
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) return { ok: false, error: msg('Hex bytes are pairs of 0-9 and a-f.') };
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: msg('These bytes are not valid UTF-8 text.') };
  }
}

// ---------------------------------------------------------------------------
// Colors: hex <-> rgb <-> hsl
// ---------------------------------------------------------------------------

export type Rgb = { r: number; g: number; b: number; a?: number };

/** #abc, #aabbcc, #aabbccdd, rgb(...), rgba(...), hsl(...), hsla(...). */
export function parseColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,4})$/);
  if (m) {
    const d = m[1].split('').map((c) => parseInt(c + c, 16));
    return { r: d[0], g: d[1], b: d[2], ...(d.length === 4 ? { a: d[3] / 255 } : {}) };
  }
  m = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, ...(m[2] ? { a: parseInt(m[2], 16) / 255 } : {}) };
  }
  m = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => Math.min(255, parseInt(x, 10)));
    const a = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : undefined;
    return { r, g, b, ...(a !== undefined ? { a } : {}) };
  }
  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (m) {
    const rgb = hslToRgb(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    const a = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : undefined;
    return { ...rgb, ...(a !== undefined ? { a } : {}) };
  }
  return null;
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** The three CSS forms of a parsed color, with the alpha suffix rule in one place. */
export function colorFormats(parsed: Rgb): { hex: string; rgb: string; hsl: string } {
  const { h, s, l } = rgbToHsl(parsed);
  const alpha = parsed.a !== undefined && parsed.a < 1 ? ` / ${Math.round(parsed.a * 100) / 100}` : '';
  return {
    hex: rgbToHex(parsed),
    rgb: `rgb(${parsed.r} ${parsed.g} ${parsed.b}${alpha})`,
    hsl: `hsl(${h} ${s}% ${l}%${alpha})`,
  };
}

export const rgbToHex = ({ r, g, b, a }: Rgb): string => {
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return a !== undefined && a < 1 ? `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}` : hex;
};

// ---------------------------------------------------------------------------
// Paper sizes (ISO 216 and North American), dimensions in millimeters
// ---------------------------------------------------------------------------

export type PaperSize = { name: string; series: 'A' | 'B' | 'NA'; w: number; h: number };

export const PAPER_SIZES: PaperSize[] = [
  { name: msg('A0'), series: 'A', w: 841, h: 1189 },
  { name: msg('A1'), series: 'A', w: 594, h: 841 },
  { name: msg('A2'), series: 'A', w: 420, h: 594 },
  { name: msg('A3'), series: 'A', w: 297, h: 420 },
  { name: msg('A4'), series: 'A', w: 210, h: 297 },
  { name: msg('A5'), series: 'A', w: 148, h: 210 },
  { name: msg('A6'), series: 'A', w: 105, h: 148 },
  { name: msg('A7'), series: 'A', w: 74, h: 105 },
  { name: msg('B0'), series: 'B', w: 1000, h: 1414 },
  { name: msg('B1'), series: 'B', w: 707, h: 1000 },
  { name: msg('B2'), series: 'B', w: 500, h: 707 },
  { name: msg('B3'), series: 'B', w: 353, h: 500 },
  { name: msg('B4'), series: 'B', w: 250, h: 353 },
  { name: msg('B5'), series: 'B', w: 176, h: 250 },
  { name: msg('Letter'), series: 'NA', w: 215.9, h: 279.4 },
  { name: msg('Legal'), series: 'NA', w: 215.9, h: 355.6 },
  { name: msg('Tabloid (Ledger)'), series: 'NA', w: 279.4, h: 431.8 },
  { name: msg('Executive'), series: 'NA', w: 184.15, h: 266.7 },
  { name: msg('Half Letter'), series: 'NA', w: 139.7, h: 215.9 },
];

export const MM_PER_INCH = 25.4;

/** The other-series size whose area is closest (how A4 maps to Letter). */
export function closestPaper(size: PaperSize): PaperSize {
  const others = PAPER_SIZES.filter((p) => p.series !== size.series);
  return others.reduce((best, p) => (Math.abs(p.w * p.h - size.w * size.h) < Math.abs(best.w * best.h - size.w * size.h) ? p : best), others[0]);
}

// ---------------------------------------------------------------------------
// Ring sizes (US scale with ISO diameters; UK letters are chart conventions)
// ---------------------------------------------------------------------------

export type RingSize = { us: number; diameter: number; circumference: number; eu: number; jp: number; uk: string };

/**
 * US sizes 3 to 13 in halves. Diameter follows the standard US scale
 * (0.8128 mm per size, anchored at US 7 = 17.32 mm); EU/ISO 8653 is the
 * circumference in mm; JP per JIS S 4700 (size 1 = 13.0 mm diameter,
 * one third of a millimeter per size); UK letters are the common jeweler
 * chart and can differ by up to half a size between charts.
 */
export function ringSizes(): RingSize[] {
  const ukLetters = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const rows: RingSize[] = [];
  for (let us = 3; us <= 13; us += 0.5) {
    const diameter = 11.63 + 0.8128 * us;
    const circumference = Math.PI * diameter;
    const jp = Math.round((diameter - 12.67) * 3);
    // One UK letter per half US size (US 3 = F, US 7 = N), the common chart
    // alignment; published charts still differ by up to half a size.
    const uk = ukLetters[Math.round((us - 3) * 2)] ?? 'Z+';
    rows.push({ us, diameter: Math.round(diameter * 100) / 100, circumference: Math.round(circumference * 10) / 10, eu: Math.round(circumference), jp, uk });
  }
  return rows;
}

/** The row closest to a measured inside diameter (mm). */
export function ringFromDiameter(mm: number): RingSize | null {
  if (!Number.isFinite(mm) || mm < 10 || mm > 25) return null;
  const rows = ringSizes();
  return rows.reduce((best, r) => (Math.abs(r.diameter - mm) < Math.abs(best.diameter - mm) ? r : best), rows[0]);
}
