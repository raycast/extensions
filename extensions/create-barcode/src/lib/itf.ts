/**
 * Interleaved 2 of 5（ITF）のエンコード処理。
 *
 * 数字のみ・偶数桁。2桁を1組にして、奇数桁目をバー・偶数桁目をスペースの太細で
 * 「交互（interleaved）」に符号化する。
 */

import type { Barcode, EncodeResult } from "./barcode.ts";
import { DEFAULT_QUIET, MAX_DATA_LENGTH, patternToWidths, tooLong, widthsToModules } from "./barcode.ts";

export const ITF_LABEL = "ITF";

/** 各数字の太細パターン（5要素・0=細 1=太）。太は必ず2つ */
const PATTERNS = ["00110", "10001", "01001", "11000", "00101", "10100", "01100", "00011", "10010", "01010"];

/** スタートパターン: 細バー・細スペース・細バー・細スペース */
const START_WIDTHS = [1, 1, 1, 1];
/** ストップパターン: 太バー・細スペース・細バー */
const STOP_WIDTHS = [3, 1, 1];

/** 入力から区切り文字を落として数字だけを取り出す。数字以外があれば null */
function normalize(input: string): string | null {
  const halfWidth = input.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const stripped = halfWidth.replace(/[\s\-_.]/g, "");
  if (stripped.length === 0) {
    return "";
  }
  return /^\d+$/.test(stripped) ? stripped : null;
}

/** 2桁ぶんの幅の並びを作る。d1 がバー、d2 がスペースになる */
function buildPairWidths(d1: string, d2: string): number[] {
  const bars = patternToWidths(PATTERNS[Number(d1)]);
  const spaces = patternToWidths(PATTERNS[Number(d2)]);

  const widths: number[] = [];
  for (let i = 0; i < 5; i++) {
    widths.push(bars[i], spaces[i]);
  }
  return widths;
}

/**
 * 入力文字列から ITF バーコードを生成する。
 * 桁数が奇数の場合は先頭に 0 を補って偶数にする（規格の慣例）。
 */
export function encode(input: string): EncodeResult {
  const normalized = normalize(input);

  if (normalized === null) {
    return { ok: false, message: "ITF accepts digits only", hint: "Use digits 0-9" };
  }
  if (normalized.length === 0) {
    return { ok: false, message: "Enter digits", hint: "An even number of digits" };
  }
  if (normalized.length > MAX_DATA_LENGTH) {
    return tooLong(ITF_LABEL, normalized.length, "digits");
  }

  // 奇数桁は先頭に 0 を足して偶数にそろえる
  const padded = normalized.length % 2 === 1 ? `0${normalized}` : normalized;

  const widths = [...START_WIDTHS];
  for (let i = 0; i < padded.length; i += 2) {
    widths.push(...buildPairWidths(padded[i], padded[i + 1]));
  }
  widths.push(...STOP_WIDTHS);

  const barcode: Barcode = {
    symbology: "itf",
    label: ITF_LABEL,
    code: padded,
    modules: widthsToModules(widths),
    guardIndices: new Set(),
    quietLeft: DEFAULT_QUIET,
    quietRight: DEFAULT_QUIET,
    textLayout: "centered",
    notice: padded !== normalized ? "Leading Zero Added" : undefined,
    details: [
      { title: "Digits", text: `${padded.length}` },
      { title: "Wide / Narrow", text: "3 : 1" },
    ],
  };

  return { ok: true, barcode };
}
