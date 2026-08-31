/**
 * CODE128 のエンコード処理。
 *
 * 印字可能な ASCII（0x20〜0x7E）を扱う。
 * 数字が続く箇所は 2桁を1シンボルに詰められるコードセット C に自動で切り替え、
 * それ以外はコードセット B で符号化する。
 */

import type { Barcode, BarcodeDetail, EncodeResult } from "./barcode.ts";
import { DEFAULT_QUIET, toHalfWidth, widthsToModules } from "./barcode.ts";

export const CODE128_LABEL = "CODE128";

/**
 * 値 0〜106 に対応する要素幅の並び（バー,スペース,…）。
 * 106 番のストップだけは7要素（末尾が2本のバー）になる。
 */
// prettier-ignore
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

/** コードセット C へ切り替える値 */
const CODE_C = 99;
/** コードセット B へ切り替える値 */
const CODE_B = 100;
const START_B = 104;
const START_C = 105;
const STOP = 106;

/** 扱える文字コードの範囲（印字可能な ASCII） */
const MIN_CHAR = 0x20;
const MAX_CHAR = 0x7e;

/** 途中でコードセット C に切り替える価値がある連続数字の長さ */
const SWITCH_TO_C = 6;
/** 末尾が数字で終わる場合に C へ切り替える最小の長さ */
const TAIL_SWITCH_TO_C = 4;

type CodeSet = "B" | "C";

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

/** 位置 i から続く数字の個数 */
function digitRun(data: string, i: number): number {
  let n = 0;
  while (i + n < data.length && isDigit(data[i + n])) {
    n++;
  }
  return n;
}

/** 先頭でどちらのコードセットから始めるかを決める */
function chooseStart(data: string): CodeSet {
  const lead = digitRun(data, 0);
  if (data.length === 2 && lead === 2) {
    return "C";
  }
  return lead >= TAIL_SWITCH_TO_C ? "C" : "B";
}

/** データ部の値の並びを組み立てる（スタート・チェックディジット・ストップは含まない） */
function buildValues(data: string, start: CodeSet): { values: number[]; usedSets: Set<CodeSet> } {
  const values: number[] = [];
  const usedSets = new Set<CodeSet>([start]);
  let mode = start;
  let i = 0;

  while (i < data.length) {
    if (mode === "C") {
      if (digitRun(data, i) >= 2) {
        values.push(Number(data.slice(i, i + 2)));
        i += 2;
        continue;
      }
      values.push(CODE_B);
      mode = "B";
      usedSets.add("B");
      continue;
    }

    const run = digitRun(data, i);
    const tail = i + run === data.length;
    if (run >= SWITCH_TO_C || (tail && run >= TAIL_SWITCH_TO_C)) {
      // 偶数個ずつしか詰められないので、奇数なら先頭の1桁だけ B のまま送る
      if (run % 2 === 1) {
        values.push(data.charCodeAt(i) - MIN_CHAR);
        i++;
      }
      values.push(CODE_C);
      mode = "C";
      usedSets.add("C");
      continue;
    }

    values.push(data.charCodeAt(i) - MIN_CHAR);
    i++;
  }

  return { values, usedSets };
}

/** モジュラス103のチェックディジット（重みは先頭から 1, 2, 3 ...） */
function calcCheckValue(startValue: number, values: number[]): number {
  let sum = startValue;
  values.forEach((value, index) => {
    sum += value * (index + 1);
  });
  return sum % 103;
}

/** 入力文字列から CODE128 バーコードを生成する */
export function encode(input: string): EncodeResult {
  const data = toHalfWidth(input).trim();

  if (data.length === 0) {
    return { ok: false, message: "Enter a CODE128 value", hint: "Printable ASCII characters" };
  }

  const invalid = Array.from(data).find((char) => {
    const code = char.charCodeAt(0);
    return code < MIN_CHAR || code > MAX_CHAR;
  });
  if (invalid !== undefined) {
    return {
      ok: false,
      message: `CODE128 cannot encode "${invalid}"`,
      hint: "Use printable ASCII characters only",
    };
  }

  const start = chooseStart(data);
  const startValue = start === "C" ? START_C : START_B;
  const { values, usedSets } = buildValues(data, start);
  const checkValue = calcCheckValue(startValue, values);

  const symbols = [startValue, ...values, checkValue, STOP];
  const widths = symbols.flatMap((value) => Array.from(PATTERNS[value], Number));

  const details: BarcodeDetail[] = [
    { title: "Characters", text: `${data.length}` },
    { title: "Code Set", text: [...usedSets].join(" → ") },
    { title: "Check Digit", text: `${checkValue} (calculated)` },
  ];

  const barcode: Barcode = {
    symbology: "code128",
    label: CODE128_LABEL,
    code: data,
    modules: widthsToModules(widths),
    guardIndices: new Set(),
    quietLeft: DEFAULT_QUIET,
    quietRight: DEFAULT_QUIET,
    textLayout: "centered",
    notice: usedSets.has("C") ? "Code Set C Used" : undefined,
    details,
    checkDigit: String(checkValue),
    completed: true,
  };

  return { ok: true, barcode };
}
