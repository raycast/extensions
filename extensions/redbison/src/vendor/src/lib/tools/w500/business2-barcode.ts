/**
 * Barcode data rules: GS1 mod-10 check digits (EAN-13, EAN-8, UPC-A, ITF-14,
 * GTIN-14), Code 39 character set and optional mod-43 check, Code 128 ASCII
 * range and ITF digit parity. Rendering itself is done by JsBarcode in the
 * component; this file decides what to send it and explains errors.
 */
import { msg } from '../../msg';

/** A message for the page to translate (src/lib/msg.ts): `{name}` placeholders filled from `vars`. */
export type BarcodeMsg = { text: string; vars: Record<string, string | number> };
const fill = (m: BarcodeMsg) => m.text.replace(/\{(\w+)\}/g, (all, k: string) => (m.vars[k] === undefined ? all : String(m.vars[k])));
const bm = (text: string, vars: Record<string, string | number> = {}): BarcodeMsg => ({ text, vars });

/** An input error with its message for translation; `message` stays English. */
export class BarcodeInputError extends Error {
  msg: BarcodeMsg;
  constructor(m: BarcodeMsg) {
    super(fill(m));
    this.msg = m;
  }
}

export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'CODE39' | 'ITF14' | 'ITF';

export type FormatInfo = {
  id: BarcodeFormat;
  label: string;
  /** Number of digits including the check digit, for GS1 numeric formats. */
  length?: number;
  sample: string;
  note: string;
};

export const BARCODE_FORMATS: FormatInfo[] = [
  { id: 'EAN13', label: 'EAN-13', length: 13, sample: '4006381333931', note: msg('Retail products worldwide. 12 data digits plus a GS1 check digit.') },
  { id: 'UPC', label: 'UPC-A', length: 12, sample: '036000291452', note: msg('Retail products in the US and Canada. 11 data digits plus a check digit.') },
  { id: 'EAN8', label: 'EAN-8', length: 8, sample: '96385074', note: msg('Small packs where EAN-13 does not fit. 7 data digits plus a check digit.') },
  { id: 'CODE128', label: 'Code 128', sample: 'RB-2026-0042', note: msg('Any ASCII text: shipping labels, asset tags, serial numbers. Check symbol added automatically.') },
  { id: 'CODE39', label: 'Code 39', sample: 'ASSET-0042', note: msg('Uppercase letters, digits and - . space $ / + %. Common on badges and older industrial systems.') },
  { id: 'ITF14', label: 'ITF-14', length: 14, sample: '15400141288763', note: msg('Outer cartons (GTIN-14). 13 data digits plus a check digit.') },
  { id: 'ITF', label: 'Interleaved 2 of 5', sample: '12345670', note: msg('Digits only, in pairs, so the length must be even.') },
];

export const GS1_LENGTHS: Record<string, number> = { EAN8: 8, UPC: 12, EAN13: 13, ITF14: 14 };

/**
 * GS1 mod-10 check digit for the data digits (everything except the check
 * digit). Weights 3 and 1 alternate starting with 3 on the rightmost data digit.
 */
export function gs1CheckDigit(data: string): number {
  if (!/^\d+$/.test(data)) throw new BarcodeInputError(bm(msg('GS1 data must be digits only.')));
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const digit = data.charCodeAt(data.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGs1(code: string): boolean {
  if (!/^\d{2,}$/.test(code)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);
}

const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

/** Code 39 modulo-43 check character. */
export function code39Mod43(text: string): string {
  let sum = 0;
  for (const ch of text) {
    const v = CODE39_CHARS.indexOf(ch);
    if (v < 0) throw new BarcodeInputError(bm(msg('"{ch}" is not a Code 39 character.'), { ch }));
    sum += v;
  }
  return CODE39_CHARS[sum % 43];
}

export type PreparedBarcode =
  | {
      ok: true;
      /** Value to hand to JsBarcode (with check digit for GS1 formats). */
      value: string;
      /** Check digit or character that was computed, if any. */
      checkDigit?: string;
      /** True when the user typed the full code including a correct check digit. */
      checkSupplied?: boolean;
      /** Human note such as "Check digit 1 added". */
      note?: string;
      /** `note` as a message for translation. */
      noteMsg?: BarcodeMsg;
      error?: undefined;
      errorMsg?: undefined;
      expectedCheck?: undefined;
    }
  | { ok: false; error: string; errorMsg: BarcodeMsg; expectedCheck?: string; value?: undefined; note?: undefined; noteMsg?: undefined; checkDigit?: undefined; checkSupplied?: undefined };

const fail = (m: BarcodeMsg, extra: { expectedCheck?: string } = {}): PreparedBarcode => ({ ok: false, error: fill(m), errorMsg: m, ...extra });
const noted = (m: BarcodeMsg) => ({ note: fill(m), noteMsg: m });

/**
 * Validate input for a format and add the GS1 check digit when the user left it
 * out. A full-length GS1 code with a wrong check digit is rejected and the
 * correct digit is reported.
 */
export function prepareBarcode(format: BarcodeFormat, raw: string, opts: { code39Mod43?: boolean } = {}): PreparedBarcode {
  const input = format === 'CODE128' ? raw : raw.trim();
  if (!input) return fail(bm(msg('Enter the value to encode.')));
  const gsLen = GS1_LENGTHS[format];
  if (gsLen) {
    const digits = input.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(digits)) return fail(bm(msg('{format} takes digits only.'), { format: labelOf(format) }));
    if (digits.length === gsLen - 1) {
      const c = String(gs1CheckDigit(digits));
      return { ok: true, value: digits + c, checkDigit: c, checkSupplied: false, ...noted(bm(msg('Check digit {c} added.'), { c })) };
    }
    if (digits.length === gsLen) {
      const c = String(gs1CheckDigit(digits.slice(0, -1)));
      if (c !== digits[gsLen - 1]) {
        return fail(bm(msg('Check digit should be {c}, not {given}. Correct code: {code}.'), { c, given: digits[gsLen - 1], code: `${digits.slice(0, -1)}${c}` }), { expectedCheck: c });
      }
      return { ok: true, value: digits, checkDigit: c, checkSupplied: true, ...noted(bm(msg('Check digit is valid.'))) };
    }
    return fail(bm(msg('{format} needs {data} digits (check digit added for you) or all {full} digits. You entered {n}.'), { format: labelOf(format), data: gsLen - 1, full: gsLen, n: digits.length }));
  }
  if (format === 'ITF') {
    const digits = input.replace(/\s/g, '');
    if (!/^\d+$/.test(digits)) return fail(bm(msg('Interleaved 2 of 5 takes digits only.')));
    if (digits.length % 2 !== 0) return fail(bm(msg('Interleaved 2 of 5 encodes digits in pairs, so it needs an even count. Add a leading zero: {code}.'), { code: `0${digits}` }));
    return { ok: true, value: digits };
  }
  if (format === 'CODE39') {
    const text = input.toUpperCase();
    const bad = Array.from(new Set(Array.from(text).filter((ch) => CODE39_CHARS.indexOf(ch) < 0)));
    if (bad.length) return fail(bm(msg('Code 39 cannot encode {chars}. Allowed: A-Z, 0-9, space and - . $ / + %.'), { chars: bad.map((b) => `"${b}"`).join(', ') }));
    if (opts.code39Mod43) {
      const c = code39Mod43(text);
      return { ok: true, value: text, checkDigit: c, ...noted(bm(msg('Mod 43 check character "{c}" added.'), { c })) };
    }
    return text !== input ? { ok: true, value: text, ...noted(bm(msg('Converted to uppercase.'))) } : { ok: true, value: text, note: undefined };
  }
  // CODE128: ASCII 0-127
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 127) return fail(bm(msg('Code 128 encodes ASCII only. "{ch}" is outside that range.'), { ch }));
  }
  if (input.length > 80) return fail(bm(msg('Keep Code 128 values to 80 characters or fewer so the barcode stays scannable.')));
  return { ok: true, value: input };
}

function labelOf(f: BarcodeFormat): string {
  return BARCODE_FORMATS.find((x) => x.id === f)?.label ?? f;
}

export type CheckDigitReport = {
  input: string;
  digits: string;
  /** Computed check digit for the data part. */
  checkDigit: number;
  /** Full code with the computed check digit. */
  fullCode: string;
  /** If the input already had a check digit, whether it is correct. null when the input is data only. */
  valid: boolean | null;
  /** Formats this length fits. */
  formats: string[];
};

/**
 * Work out what a numeric code is: if its length is a full GTIN (8, 12, 13, 14)
 * the last digit is treated as the check digit and verified; if it is one short
 * of those lengths the check digit is computed. `mode` forces either reading.
 */
export function analyzeGtin(raw: string, mode: 'auto' | 'compute' | 'validate' = 'auto'): CheckDigitReport {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) throw new BarcodeInputError(bm(msg('Enter digits only (spaces and dashes are ignored).')));
  const full = [8, 12, 13, 14];
  const data = [7, 11, 12, 13];
  let validate: boolean;
  if (mode === 'validate') validate = true;
  else if (mode === 'compute') validate = false;
  else if (full.includes(digits.length) && !data.includes(digits.length)) validate = true;
  else if (data.includes(digits.length) && !full.includes(digits.length)) validate = false;
  else if (digits.length === 12 || digits.length === 13) validate = true;
  else throw new BarcodeInputError(bm(msg('A GTIN has 8, 12, 13 or 14 digits including the check digit. {n} digits does not fit; choose compute or validate.'), { n: digits.length }));
  const body = validate ? digits.slice(0, -1) : digits;
  if (body.length < 1) throw new BarcodeInputError(bm(msg('Enter at least two digits.')));
  const c = gs1CheckDigit(body);
  const fullCode = body + c;
  const names: Record<number, string> = { 8: 'EAN-8 (GTIN-8)', 12: 'UPC-A (GTIN-12)', 13: 'EAN-13 (GTIN-13)', 14: 'ITF-14 (GTIN-14)' };
  return {
    input: raw,
    digits,
    checkDigit: c,
    fullCode,
    valid: validate ? Number(digits[digits.length - 1]) === c : null,
    formats: names[fullCode.length] ? [names[fullCode.length]] : [],
  };
}

/** Pad a GTIN-8/12/13 to the 14-digit form used in GS1 databases. */
export function toGtin14(code: string): string {
  return code.padStart(14, '0');
}
