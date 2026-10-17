/**
 * EAN-13（日本では JAN-13 と呼ばれる規格）のエンコード処理。
 *
 * 外部ライブラリに依存せず、モジュール列（バーの並び）までをここで組み立てる。
 * SVG / PNG のレンダラはこの結果だけを入力にする。
 */

import type { Barcode, EncodeResult } from "./barcode.ts";

export const EAN13_LABEL = "EAN-13";

/** 左側・奇数パリティ（Lコード） */
const L_CODES = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

/** 左側・偶数パリティ（Gコード） */
const G_CODES = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];

/** 右側（Rコード）。Lコードのビット反転 */
const R_CODES = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];

/** 先頭桁が決める、左6桁のパリティパターン */
const PARITY_PATTERNS = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

const START_GUARD = "101";
const CENTER_GUARD = "01010";
const END_GUARD = "101";

/** チェックディジットを除いた桁数 */
const BODY_LENGTH = 12;
/** チェックディジットまで含んだ桁数 */
const CODE_LENGTH = 13;
/** 開始・終了ガードの幅（モジュール） */
const GUARD_WIDTH = 3;
/** 片側のデータ領域の幅（6桁 × 7モジュール） */
const HALF_WIDTH = 6 * 7;

/** 先頭桁を左のクワイエットゾーンに書くため、左は広めに取る */
const QUIET_LEFT = 11;
const QUIET_RIGHT = 7;

/**
 * 入力文字列からハイフン・空白・全角数字を正規化して数字のみを取り出す。
 * 数字以外の文字が含まれていた場合は null を返す。
 */
export function normalizeInput(input: string): string | null {
  // 全角数字を半角に変換してから、区切りとして使われがちな文字を除去する
  const halfWidth = input.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const stripped = halfWidth.replace(/[\s\-_.]/g, "");
  if (stripped.length === 0) {
    return "";
  }
  return /^\d+$/.test(stripped) ? stripped : null;
}

/**
 * モジュラス10ウェイト3によるチェックディジットを計算する。
 * `body` はチェックディジットを除いた12桁。
 *
 * 重みは末尾（チェックディジットの隣）から 3, 1, 3, 1 ... と割り当てる。
 */
export function calcCheckDigit(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    // 末尾からの位置が偶数（0, 2, ...）なら重み3
    const fromEnd = body.length - 1 - i;
    const weight = fromEnd % 2 === 0 ? 3 : 1;
    sum += Number(body[i]) * weight;
  }
  return String((10 - (sum % 10)) % 10);
}

/** 文字列 "0101" を boolean[] に変換する */
function toModules(bits: string): boolean[] {
  return Array.from(bits, (bit) => bit === "1");
}

/** 13桁のコードからモジュール列を組み立てる */
function buildModules(code: string): boolean[] {
  const digits = Array.from(code, Number);
  const parity = PARITY_PATTERNS[digits[0]];

  let bits = START_GUARD;
  for (let i = 0; i < 6; i++) {
    const digit = digits[i + 1];
    bits += parity[i] === "L" ? L_CODES[digit] : G_CODES[digit];
  }
  bits += CENTER_GUARD;
  for (let i = 0; i < 6; i++) {
    bits += R_CODES[digits[i + 7]];
  }
  bits += END_GUARD;

  return toModules(bits);
}

/** 開始・中央・終了ガードのモジュール位置を列挙する */
function buildGuardIndices(): Set<number> {
  const indices = new Set<number>();
  const centerStart = GUARD_WIDTH + HALF_WIDTH;
  const rightStart = centerStart + CENTER_GUARD.length + HALF_WIDTH;

  for (let i = 0; i < GUARD_WIDTH; i++) {
    indices.add(i);
    indices.add(rightStart + i);
  }
  for (let i = 0; i < CENTER_GUARD.length; i++) {
    indices.add(centerStart + i);
  }
  return indices;
}

/**
 * 入力文字列から EAN-13 バーコードを生成する。
 *
 * - 12桁 → チェックディジットを計算して補完
 * - 13桁 → チェックディジットを検証し、不一致なら正しい値に訂正して警告を返す
 */
export function encode(input: string): EncodeResult {
  const normalized = normalizeInput(input);

  if (normalized === null) {
    return { ok: false, message: "Input contains non-numeric characters", hint: "Use digits 0-9 only" };
  }
  if (normalized.length === 0) {
    return { ok: false, message: "Enter an EAN-13 code", hint: "12 or 13 digits" };
  }
  if (normalized.length !== BODY_LENGTH && normalized.length !== CODE_LENGTH) {
    return {
      ok: false,
      message: `${normalized.length} digits is not a valid EAN-13 code`,
      hint: "Enter 12 or 13 digits",
    };
  }

  const body = normalized.slice(0, BODY_LENGTH);
  const checkDigit = calcCheckDigit(body);
  const code = body + checkDigit;
  const completed = normalized.length === BODY_LENGTH;

  const barcode: Barcode = {
    symbology: "ean13",
    label: EAN13_LABEL,
    code,
    checkDigit,
    completed,
    modules: buildModules(code),
    guardIndices: buildGuardIndices(),
    quietLeft: QUIET_LEFT,
    quietRight: QUIET_RIGHT,
    textLayout: "ean13",
    notice: completed ? "Check Digit Added" : undefined,
    details: [{ title: "Check Digit", text: `${checkDigit} (${completed ? "calculated" : "verified"})` }],
  };

  // チェックディジットまで入力されていて、それが誤っていた場合は訂正した旨を伝える
  if (!completed && normalized[BODY_LENGTH] !== checkDigit) {
    return {
      ok: true,
      barcode,
      warning: `Check digit was incorrect (entered ${normalized[BODY_LENGTH]}, expected ${checkDigit}). Generated with the correct value.`,
    };
  }

  return { ok: true, barcode };
}
