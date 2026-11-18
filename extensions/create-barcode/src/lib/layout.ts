/**
 * バーコードの寸法計算。SVG レンダラと PNG レンダラの両方がこの結果を使う。
 *
 * 座標の単位はすべて「モジュール幅（X）」。実際の描画時に倍率を掛ける。
 * バー高さ 69X・ガードバーの 5X 延長は EAN-13 の標準寸法に合わせている。
 * クワイエットゾーンはシンボロジーごとの値（Barcode.quietLeft / quietRight）を使う。
 */

import type { Barcode } from "./barcode.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextItem {
  text: string;
  /** 文字列の中心となる X 座標 */
  centerX: number;
}

export interface Layout {
  /** クワイエットゾーンを含む全幅（モジュール単位） */
  width: number;
  /** 全高（モジュール単位） */
  height: number;
  /** 黒バーの矩形（連続するモジュールはまとめてある） */
  bars: Rect[];
  texts: TextItem[];
  /** 数字の描画領域の上端 */
  textTop: number;
  /** 数字の高さ */
  textHeight: number;
  /** 1文字あたりの送り幅 */
  charAdvance: number;
}

const TOP_MARGIN = 2;
const BAR_HEIGHT = 69;
/** ガードバーを下に伸ばす量 */
const GUARD_EXTRA = 5;
const TEXT_GAP = 1;
const TEXT_HEIGHT = 7;
const BOTTOM_MARGIN = 2;
const CHAR_ADVANCE = 6;

const TEXT_TOP = TOP_MARGIN + BAR_HEIGHT + GUARD_EXTRA + TEXT_GAP;
const TOTAL_HEIGHT = TEXT_TOP + TEXT_HEIGHT + BOTTOM_MARGIN;

export function buildLayout(barcode: Barcode): Layout {
  const symbolWidth = barcode.quietLeft + barcode.modules.length + barcode.quietRight;
  // 文字列がシンボルより長い場合ははみ出すので、その分だけ左右に余白を足す
  const overflow = textWidth(barcode) - symbolWidth;
  const extra = barcode.textLayout === "centered" && overflow > 0 ? Math.ceil(overflow / 2) : 0;

  const width = symbolWidth + extra * 2;
  const barsLeft = barcode.quietLeft + extra;

  return {
    width,
    height: TOTAL_HEIGHT,
    bars: buildBars(barcode, barsLeft),
    texts: buildTexts(barcode, barsLeft, width),
    textTop: TEXT_TOP,
    textHeight: TEXT_HEIGHT,
    charAdvance: CHAR_ADVANCE,
  };
}

/** 表示文字列を描くのに必要な幅 */
function textWidth(barcode: Barcode): number {
  return barcode.code.length * CHAR_ADVANCE;
}

/** 連続する同じ高さの黒モジュールを1つの矩形にまとめる */
function buildBars(barcode: Barcode, quietLeft: number): Rect[] {
  const bars: Rect[] = [];
  let run: Rect | null = null;

  for (let i = 0; i < barcode.modules.length; i++) {
    if (!barcode.modules[i]) {
      run = null;
      continue;
    }
    const height = BAR_HEIGHT + (barcode.guardIndices.has(i) ? GUARD_EXTRA : 0);
    if (run && run.height === height) {
      run.width += 1;
      continue;
    }
    run = { x: quietLeft + i, y: TOP_MARGIN, width: 1, height };
    bars.push(run);
  }
  return bars;
}

function buildTexts(barcode: Barcode, quietLeft: number, width: number): TextItem[] {
  if (barcode.textLayout === "ean13") {
    return buildEanTexts(barcode, quietLeft);
  }
  // EAN 以外はシンボルの下に中央寄せで1行
  return [{ text: barcode.code, centerX: width / 2 }];
}

/** EAN の数字の配置。中央ガードを挟んで左右に分けて並べる */
function buildEanTexts(barcode: Barcode, quietLeft: number): TextItem[] {
  const guardWidth = 3;
  const centerWidth = 5;
  const half = 42;

  const leftCenter = quietLeft + guardWidth + half / 2;
  const rightCenter = quietLeft + guardWidth + half + centerWidth + half / 2;

  return [
    // 先頭桁はバー領域の外（左のクワイエットゾーン）に置く
    { text: barcode.code.slice(0, 1), centerX: quietLeft - CHAR_ADVANCE / 2 - 1 },
    { text: barcode.code.slice(1, 7), centerX: leftCenter },
    { text: barcode.code.slice(7, 13), centerX: rightCenter },
  ];
}
