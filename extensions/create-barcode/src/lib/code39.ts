/**
 * CODE39 のエンコード処理。
 *
 * 数字・英大文字と - . スペース $ / + % を扱う。
 * 1文字は9要素（バー5・スペース4、うち太が3つ）で、文字の間に細スペースを1つ入れる。
 * 前後は必ず `*`（スタート／ストップ）で挟む。
 */

import type { Barcode, EncodeResult } from "./barcode.ts";
import { DEFAULT_QUIET, patternToWidths, toHalfWidth, widthsToModules } from "./barcode.ts";

export const CODE39_LABEL = "CODE39";

/** パターン表と対応する文字。末尾の * はスタート／ストップ専用 */
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*";

/** 各文字の太細パターン（9要素・0=細 1=太）。並びは バー,スペース,…,バー */
const PATTERNS = [
  "000110100",
  "100100001",
  "001100001",
  "101100000",
  "000110001",
  "100110000",
  "001110000",
  "000100101",
  "100100100",
  "001100100",
  "100001001",
  "001001001",
  "101001000",
  "000011001",
  "100011000",
  "001011000",
  "000001101",
  "100001100",
  "001001100",
  "000011100",
  "100000011",
  "001000011",
  "101000010",
  "000010011",
  "100010010",
  "001010010",
  "000000111",
  "100000110",
  "001000110",
  "000010110",
  "110000001",
  "011000001",
  "111000000",
  "010010001",
  "110010000",
  "011010000",
  "010000101",
  "110000100",
  "011000100",
  "010101000",
  "010100010",
  "010001010",
  "000101010",
  "010010100",
];

const START_STOP = "*";

/**
 * 入力文字列から CODE39 バーコードを生成する。
 * 英小文字は大文字に直してから符号化する（CODE39 に小文字はない）。
 */
export function encode(input: string): EncodeResult {
  const data = toHalfWidth(input).trim().toUpperCase();

  if (data.length === 0) {
    return { ok: false, message: "Enter a CODE39 value", hint: "Digits, A-Z, and - . space $ / + %" };
  }

  const invalid = Array.from(data).find((char) => char === START_STOP || !ALPHABET.includes(char));
  if (invalid !== undefined) {
    return {
      ok: false,
      message: `CODE39 cannot encode "${invalid}"`,
      hint: "Use digits, A-Z, and - . space $ / + %",
    };
  }

  const chars = [START_STOP, ...data, START_STOP];
  const widths: number[] = [];
  chars.forEach((char, index) => {
    if (index > 0) {
      // 文字と文字の間は細スペースで区切る
      widths.push(1);
    }
    widths.push(...patternToWidths(PATTERNS[ALPHABET.indexOf(char)]));
  });

  const barcode: Barcode = {
    symbology: "code39",
    label: CODE39_LABEL,
    code: data,
    modules: widthsToModules(widths),
    guardIndices: new Set(),
    quietLeft: DEFAULT_QUIET,
    quietRight: DEFAULT_QUIET,
    textLayout: "centered",
    notice: data !== toHalfWidth(input).trim() ? "Uppercased" : undefined,
    details: [
      { title: "Characters", text: `${data.length}` },
      { title: "Start / Stop", text: "* / *" },
      { title: "Wide / Narrow", text: "3 : 1" },
    ],
  };

  return { ok: true, barcode };
}
