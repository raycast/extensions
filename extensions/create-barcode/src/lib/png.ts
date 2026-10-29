/**
 * PNG の書き出し。
 *
 * Raycast 拡張はネイティブモジュールをバンドルできないため、canvas や sharp は使えない。
 * バーコードは白黒の矩形の集まりなので、8bit グレースケールの PNG を
 * Node 標準の zlib だけで組み立てている。
 */

import { deflateSync } from "node:zlib";
import type { Barcode } from "./barcode.ts";
import { buildLayout, type Layout, type TextItem } from "./layout.ts";
import { GLYPH_HEIGHT, GLYPH_WIDTH, getGlyph } from "./font.ts";

export const WHITE = 255;
export const BLACK = 0;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 8bit グレースケールの描画バッファ */
export class GrayCanvas {
  readonly width: number;
  readonly height: number;
  private readonly pixels: Uint8Array;

  constructor(width: number, height: number, fill: number = WHITE) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height).fill(fill);
  }

  /** 矩形を塗る。キャンバス外にはみ出した分は切り詰める */
  fillRect(x: number, y: number, width: number, height: number, value: number): void {
    const left = Math.max(0, Math.round(x));
    const top = Math.max(0, Math.round(y));
    const right = Math.min(this.width, Math.round(x + width));
    const bottom = Math.min(this.height, Math.round(y + height));

    for (let py = top; py < bottom; py++) {
      this.pixels.fill(value, py * this.width + left, py * this.width + right);
    }
  }

  toPng(): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // ビット深度
    ihdr[9] = 0; // カラータイプ: グレースケール
    ihdr[10] = 0; // 圧縮方式: deflate
    ihdr[11] = 0; // フィルタ方式
    ihdr[12] = 0; // インターレースなし

    // 各走査線の先頭にフィルタタイプ（0 = None）を付ける
    const stride = this.width + 1;
    const raw = Buffer.alloc(stride * this.height);
    for (let y = 0; y < this.height; y++) {
      raw.set(this.pixels.subarray(y * this.width, (y + 1) * this.width), y * stride + 1);
    }

    return Buffer.concat([
      PNG_SIGNATURE,
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

/**
 * バーコードを PNG にする。
 * `scale` は 1 モジュールあたりのピクセル数。
 */
export function renderPng(barcode: Barcode, scale: number): Buffer {
  const layout = buildLayout(barcode);
  const size = Math.max(1, Math.round(scale));
  const canvas = new GrayCanvas(layout.width * size, layout.height * size);

  for (const bar of layout.bars) {
    canvas.fillRect(bar.x * size, bar.y * size, bar.width * size, bar.height * size, BLACK);
  }
  for (const text of layout.texts) {
    drawText(canvas, text, layout, size);
  }
  return canvas.toPng();
}

/** ビットマップフォントで数字を描く */
function drawText(canvas: GrayCanvas, item: TextItem, layout: Layout, size: number): void {
  const blockWidth = item.text.length * layout.charAdvance;
  const left = item.centerX - blockWidth / 2;
  // グリフ幅より送り幅が広いぶんを、セルの左右に均等に振り分ける
  const sidePadding = (layout.charAdvance - GLYPH_WIDTH) / 2;

  for (let i = 0; i < item.text.length; i++) {
    const glyph = getGlyph(item.text[i]);
    if (!glyph) {
      continue;
    }
    const originX = left + i * layout.charAdvance + sidePadding;

    for (let gy = 0; gy < GLYPH_HEIGHT; gy++) {
      const row = glyph[gy];
      for (let gx = 0; gx < GLYPH_WIDTH; gx++) {
        if (row[gx] !== "#") {
          continue;
        }
        canvas.fillRect((originX + gx) * size, (layout.textTop + gy) * size, size, size, BLACK);
      }
    }
  }
}

/** 長さ + タイプ + データ + CRC32 の PNG チャンクを組み立てる */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

let crcTable: Uint32Array | undefined;

function getCrcTable(): Uint32Array {
  if (crcTable) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(buffer: Buffer): number {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = table[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
