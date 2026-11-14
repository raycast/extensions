/**
 * SVG の書き出し。
 *
 * viewBox をモジュール単位にしているので、width / height を変えるだけで
 * 品質を落とさずに拡大縮小できる。
 */

import type { Barcode } from "./barcode.ts";
import { buildLayout } from "./layout.ts";

/** 数字に使うフォント。バーコードの規格書体（OCR-B）に近い等幅フォントを優先する */
const FONT_FAMILY = "'OCR B', 'Courier New', Courier, monospace";
/** 等幅フォントは字送りが font-size の約 0.6 倍なので、送り幅 6X に合わせる */
const FONT_SIZE = 10;

/**
 * バーコードを SVG 文字列にする。
 * `scale` は 1 モジュールあたりのピクセル数（width / height 属性の算出にのみ使う）。
 */
export function renderSvg(barcode: Barcode, scale = 2): string {
  const layout = buildLayout(barcode);
  const width = layout.width * scale;
  const height = layout.height * scale;
  const baseline = layout.textTop + layout.textHeight;

  const bars = layout.bars
    .map(
      (bar) => `    <rect x="${fmt(bar.x)}" y="${fmt(bar.y)}" width="${fmt(bar.width)}" height="${fmt(bar.height)}"/>`,
    )
    .join("\n");

  const texts = layout.texts
    .map((text) => `    <text x="${fmt(text.centerX)}" y="${fmt(baseline)}">${escapeXml(text.text)}</text>`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(layout.width)} ${fmt(layout.height)}" role="img" aria-label="${escapeXml(barcode.code)}">
  <rect width="${fmt(layout.width)}" height="${fmt(layout.height)}" fill="#ffffff"/>
  <g fill="#000000" shape-rendering="crispEdges">
${bars}
  </g>
  <g fill="#000000" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" text-anchor="middle">
${texts}
  </g>
</svg>
`;
}

/** 余計な小数を付けずに数値を文字列化する */
function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

/** CODE39 / CODE128 は & や < を含みうるので、XML として安全な形に直す */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
