/**
 * バーコード共通の型と、エンコーダが共有する小さなヘルパー。
 *
 * 各シンボロジー（EAN-13 / ITF / NW-7 / CODE39 / CODE128）は
 * 「モジュール列（バーの並び）」まで組み立てて Barcode を返す。
 * レイアウト・SVG・PNG のレンダラはこの Barcode だけを入力にする。
 */

/** 対応しているバーコードの種類 */
export type SymbologyId = "ean13" | "itf" | "nw7" | "code39" | "code128";

/** Detail のメタデータに1行として並べる補足情報 */
export interface BarcodeDetail {
  title: string;
  text: string;
}

export interface Barcode {
  symbology: SymbologyId;
  /** 画面に出す名前（"EAN-13" など） */
  label: string;
  /** 完成したコード。バーの下に表示し、コピーの対象にもなる */
  code: string;
  /** true が黒バー。クワイエットゾーンは含まない */
  modules: boolean[];
  /** 下に長く伸ばすモジュール（EAN のガードバー）の位置 */
  guardIndices: Set<number>;
  /** 左右のクワイエットゾーン（モジュール単位） */
  quietLeft: number;
  quietRight: number;
  /** 数字・文字の並べ方。EAN だけは中央ガードを挟んで分割する */
  textLayout: "ean13" | "centered";
  /** 一覧行に出す短い注記（"Check Digit Added" など） */
  notice?: string;
  /** Detail のメタデータに並べる補足情報 */
  details: BarcodeDetail[];
  /** チェックディジット（持つシンボロジーのみ） */
  checkDigit?: string;
  /** チェックディジットを自動補完した場合に true */
  completed?: boolean;
}

export type EncodeResult =
  { ok: true; barcode: Barcode; warning?: string } | { ok: false; message: string; hint?: string };

/** N/W 系シンボロジーの太バーの幅（細バーの何倍か） */
export const WIDE_RATIO = 3;

/** EAN 以外で使うクワイエットゾーン（規格上の最小は 10X） */
export const DEFAULT_QUIET = 10;

/**
 * 幅の並びをモジュール列に展開する。
 * 先頭要素は必ずバー（黒）で、以降はバーと空白が交互になる。
 */
export function widthsToModules(widths: number[]): boolean[] {
  const modules: boolean[] = [];
  for (let i = 0; i < widths.length; i++) {
    const isBar = i % 2 === 0;
    for (let n = 0; n < widths[i]; n++) {
      modules.push(isBar);
    }
  }
  return modules;
}

/** "0101" 形式の太細パターン（0=細, 1=太）を幅の並びに変換する */
export function patternToWidths(pattern: string): number[] {
  return Array.from(pattern, (bit) => (bit === "1" ? WIDE_RATIO : 1));
}

/** 全角英数字・記号を半角に直し、前後の空白を落とす */
export function toHalfWidth(input: string): string {
  // ！-～ は全角の ! から ~ まで。u+3000 の全角スペースも半角に直す
  return input.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, " ");
}
