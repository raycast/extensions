/**
 * NW-7（Codabar）のエンコード処理。
 *
 * 数字と - $ : / . + を扱い、前後を A〜D のスタート／ストップ文字で挟む。
 * 1文字は7要素（バー4・スペース3）で、文字と文字の間に細スペースを1つ入れる。
 */

import type { Barcode, EncodeResult } from "./barcode.ts";
import { DEFAULT_QUIET, patternToWidths, toHalfWidth, widthsToModules } from "./barcode.ts";

export const NW7_LABEL = "NW-7";

/** パターン表と対応する文字。末尾の ABCD はスタート／ストップ専用 */
const ALPHABET = "0123456789-$:/.+ABCD";

/** 各文字の太細パターン（7要素・0=細 1=太）。並びは バー,スペース,…,バー */
const PATTERNS = [
  "0000011",
  "0000110",
  "0001001",
  "1100000",
  "0010010",
  "1000010",
  "0100001",
  "0100100",
  "0110000",
  "1001000",
  "0001100",
  "0011000",
  "1000101",
  "1010001",
  "1010100",
  "0010101",
  "0011010",
  "0101001",
  "0001011",
  "0001110",
];

/** データとして使える文字（スタート／ストップを除く） */
const DATA_CHARS = "0123456789-$:/.+";
const START_STOP_CHARS = "ABCD";
/** スタート／ストップが省略されたときに補う文字 */
const DEFAULT_START_STOP = "A";

/**
 * 入力文字列から NW-7 バーコードを生成する。
 * 先頭と末尾が A〜D ならそれをスタート／ストップとして使い、無ければ A で挟む。
 */
export function encode(input: string): EncodeResult {
  const normalized = toHalfWidth(input).trim().toUpperCase();

  if (normalized.length === 0) {
    return { ok: false, message: "Enter a NW-7 code", hint: "Digits and - $ : / . +" };
  }

  const hasStartStop =
    normalized.length >= 3 &&
    START_STOP_CHARS.includes(normalized[0]) &&
    START_STOP_CHARS.includes(normalized[normalized.length - 1]);

  const start = hasStartStop ? normalized[0] : DEFAULT_START_STOP;
  const stop = hasStartStop ? normalized[normalized.length - 1] : DEFAULT_START_STOP;
  const data = hasStartStop ? normalized.slice(1, -1) : normalized;

  if (data.length === 0) {
    return { ok: false, message: "NW-7 needs data between the start and stop characters", hint: "Example: A123456B" };
  }

  const invalid = Array.from(data).find((char) => !DATA_CHARS.includes(char));
  if (invalid !== undefined) {
    return {
      ok: false,
      message: `NW-7 cannot encode "${invalid}"`,
      hint: "Use digits and - $ : / . + (wrap with A-D for start/stop)",
    };
  }

  const chars = [start, ...data, stop];
  const widths: number[] = [];
  chars.forEach((char, index) => {
    if (index > 0) {
      // 文字と文字の間は細スペースで区切る
      widths.push(1);
    }
    widths.push(...patternToWidths(PATTERNS[ALPHABET.indexOf(char)]));
  });

  const code = chars.join("");

  const barcode: Barcode = {
    symbology: "nw7",
    label: NW7_LABEL,
    code,
    modules: widthsToModules(widths),
    guardIndices: new Set(),
    quietLeft: DEFAULT_QUIET,
    quietRight: DEFAULT_QUIET,
    textLayout: "centered",
    notice: hasStartStop ? undefined : "Start/Stop Added",
    details: [
      { title: "Data", text: data },
      { title: "Start / Stop", text: `${start} / ${stop}` },
      { title: "Wide / Narrow", text: "3 : 1" },
    ],
  };

  return { ok: true, barcode };
}
