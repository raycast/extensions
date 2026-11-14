/**
 * 対応するシンボロジー（バーコードの種類）の一覧。
 *
 * 画面はこの並び順でバーコードを出す。上にあるものほど「入力に対して素直な解釈」で、
 * CODE128 はほぼどんな文字列でも通るので最後に置いている。
 */

import type { EncodeResult, SymbologyId } from "./barcode.ts";
import { CODE128_LABEL, encode as encodeCode128 } from "./code128.ts";
import { CODE39_LABEL, encode as encodeCode39 } from "./code39.ts";
import { NW7_LABEL, encode as encodeCodabar } from "./codabar.ts";
import { EAN13_LABEL, encode as encodeEan13 } from "./ean.ts";
import { ITF_LABEL, encode as encodeItf } from "./itf.ts";

export interface Symbology {
  id: SymbologyId;
  /** 画面に出す名前 */
  label: string;
  /** ドロップダウンで選んだときの検索バーの説明 */
  placeholder: string;
  encode: (input: string) => EncodeResult;
}

export const SYMBOLOGIES: Symbology[] = [
  {
    id: "ean13",
    label: EAN13_LABEL,
    placeholder: "Enter an EAN-13 code (12 digits auto-completes the check digit)",
    encode: encodeEan13,
  },
  {
    id: "itf",
    label: ITF_LABEL,
    placeholder: "Enter digits for ITF (Interleaved 2 of 5)",
    encode: encodeItf,
  },
  {
    id: "nw7",
    label: NW7_LABEL,
    placeholder: "Enter a NW-7 (Codabar) value: digits and - $ : / . +",
    encode: encodeCodabar,
  },
  {
    id: "code39",
    label: CODE39_LABEL,
    placeholder: "Enter a CODE39 value: digits, A-Z, and - . space $ / + %",
    encode: encodeCode39,
  },
  {
    id: "code128",
    label: CODE128_LABEL,
    placeholder: "Enter a CODE128 value: printable ASCII characters",
    encode: encodeCode128,
  },
];

export interface SymbologyResult {
  symbology: Symbology;
  result: EncodeResult;
}

/** すべてのシンボロジーで符号化を試す */
export function encodeAll(input: string): SymbologyResult[] {
  return SYMBOLOGIES.map((symbology) => ({ symbology, result: symbology.encode(input) }));
}

export function findSymbology(id: string): Symbology | undefined {
  return SYMBOLOGIES.find((symbology) => symbology.id === id);
}
