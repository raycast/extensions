import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inflateSync } from "node:zlib";
import { encode } from "../src/lib/ean.ts";
import { buildLayout } from "../src/lib/layout.ts";
import { renderPng } from "../src/lib/png.ts";
import { renderSvg } from "../src/lib/svg.ts";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** テスト用の最小限の PNG リーダー（グレースケール・フィルタ None 前提） */
function readGrayPng(png: Buffer): { width: number; height: number; pixels: Uint8Array } {
  assert.deepEqual(png.subarray(0, 8), PNG_SIGNATURE, "PNG シグネチャが不正");

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatParts: Buffer[] = [];
  let sawEnd = false;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("latin1", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, "ビット深度は8のはず");
      assert.equal(data[9], 0, "カラータイプはグレースケールのはず");
      assert.equal(data[12], 0, "インターレースは無効のはず");
    } else if (type === "IDAT") {
      idatParts.push(Buffer.from(data));
    } else if (type === "IEND") {
      sawEnd = true;
    }
    offset += 12 + length;
  }

  assert.ok(sawEnd, "IEND チャンクがない");

  const raw = inflateSync(Buffer.concat(idatParts));
  const stride = width + 1;
  assert.equal(raw.length, stride * height, "展開後のサイズが不正");

  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * stride], 0, `${y}行目のフィルタタイプが 0 でない`);
    pixels.set(raw.subarray(y * stride + 1, (y + 1) * stride), y * width);
  }
  return { width, height, pixels };
}

describe("layout", () => {
  it("バーの合計幅は黒モジュールの数と一致する", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);

    const totalBarWidth = layout.bars.reduce((sum, bar) => sum + bar.width, 0);
    const blackModules = result.barcode.modules.filter(Boolean).length;
    assert.equal(totalBarWidth, blackModules);
  });

  it("ガードバーは通常のバーより長い", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);

    const heights = [...new Set(layout.bars.map((bar) => bar.height))].sort((a, b) => a - b);
    assert.equal(heights.length, 2, "通常バーとガードバーの2種類の高さがあるはず");
    assert.ok(heights[1] > heights[0]);
  });

  it("クワイエットゾーンを含む幅になる（11 + 95 + 7）", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    assert.equal(buildLayout(result.barcode).width, 113);
  });

  it("数字は 1 + 6 + 6 桁に分かれる", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const texts = buildLayout(result.barcode).texts;
    assert.deepEqual(
      texts.map((t) => t.text),
      ["4", "912345", "678904"],
    );
  });
});

describe("renderPng", () => {
  it("倍率どおりのサイズで出力される", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);

    const png = readGrayPng(renderPng(result.barcode, 4));
    assert.equal(png.width, layout.width * 4);
    assert.equal(png.height, layout.height * 4);
  });

  it("バー領域のピクセルがモジュール列と一致する", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);
    const scale = 3;
    const png = readGrayPng(renderPng(result.barcode, scale));

    // バーの縦方向の中央あたりを1行読み取って、モジュールの並びと突き合わせる
    const y = Math.floor(layout.bars[0].y * scale + (layout.bars[0].height * scale) / 2);
    const quietLeft = layout.bars[0].x; // 最初のバーは開始ガードなのでクワイエットゾーンの幅と等しい

    for (let i = 0; i < result.barcode.modules.length; i++) {
      // モジュールの中央のピクセルを見る
      const x = (quietLeft + i) * scale + Math.floor(scale / 2);
      const value = png.pixels[y * png.width + x];
      assert.equal(value === 0, result.barcode.modules[i], `モジュール ${i} の色が一致しない`);
    }
  });

  it("クワイエットゾーンは白のまま", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const png = readGrayPng(renderPng(result.barcode, 4));

    // 左上の角（クワイエットゾーン）
    assert.equal(png.pixels[0], 255);
    // 右上の角
    assert.equal(png.pixels[png.width - 1], 255);
  });

  it("数字が描画されている（テキスト領域に黒ピクセルがある）", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);
    const scale = 4;
    const png = readGrayPng(renderPng(result.barcode, scale));

    const top = layout.textTop * scale;
    const bottom = (layout.textTop + layout.textHeight) * scale;
    let blackCount = 0;
    for (let y = top; y < bottom; y++) {
      for (let x = 0; x < png.width; x++) {
        if (png.pixels[y * png.width + x] === 0) {
          blackCount++;
        }
      }
    }
    assert.ok(blackCount > 0, "テキスト領域に何も描かれていない");
  });
});

describe("renderSvg", () => {
  it("viewBox がモジュール単位になっている", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const svg = renderSvg(result.barcode);
    assert.match(svg, /viewBox="0 0 113 86"/);
  });

  it("バーの数だけ rect がある（背景を含む）", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const layout = buildLayout(result.barcode);
    const svg = renderSvg(result.barcode);

    const rectCount = svg.match(/<rect /g)?.length ?? 0;
    assert.equal(rectCount, layout.bars.length + 1);
  });

  it("数字が text 要素として含まれる", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const svg = renderSvg(result.barcode);

    assert.match(svg, />4</);
    assert.match(svg, />912345</);
    assert.match(svg, />678904</);
  });
});
