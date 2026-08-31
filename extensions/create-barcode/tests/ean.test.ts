import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcCheckDigit, encode, normalizeInput } from "../src/lib/ean.ts";

/**
 * 右側（Rコード）の規格値。テスト側はこれだけを持ち、
 * Lコード（Rのビット反転）と Gコード（Rの逆順）は導出する。
 * こうすることで実装のテーブルをコピーせずに検証できる。
 */
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
const L_CODES = R_CODES.map((bits) => Array.from(bits, (b) => (b === "1" ? "0" : "1")).join(""));
const G_CODES = R_CODES.map((bits) => Array.from(bits).reverse().join(""));
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

/** モジュール列を読み取ってコードに戻す。往復させて実装を検証するために使う */
function decode(modules: boolean[]): string {
  const bits = modules.map((m) => (m ? "1" : "0")).join("");
  const half = 6;

  assert.equal(bits.slice(0, 3), "101", "開始ガードが不正");
  assert.equal(bits.slice(3 + half * 7, 3 + half * 7 + 5), "01010", "中央ガードが不正");
  assert.equal(bits.slice(-3), "101", "終了ガードが不正");

  const parity: string[] = [];
  const left: string[] = [];
  for (let i = 0; i < half; i++) {
    const part = bits.slice(3 + i * 7, 3 + (i + 1) * 7);
    const asL = L_CODES.indexOf(part);
    const asG = G_CODES.indexOf(part);
    assert.ok(asL !== -1 || asG !== -1, `左${i + 1}桁目が L/G コードに一致しない: ${part}`);
    parity.push(asL !== -1 ? "L" : "G");
    left.push(String(asL !== -1 ? asL : asG));
  }

  const rightStart = 3 + half * 7 + 5;
  const right: string[] = [];
  for (let i = 0; i < half; i++) {
    const part = bits.slice(rightStart + i * 7, rightStart + (i + 1) * 7);
    const digit = R_CODES.indexOf(part);
    assert.ok(digit !== -1, `右${i + 1}桁目が R コードに一致しない: ${part}`);
    right.push(String(digit));
  }

  // 先頭桁はバーではなく左6桁のパリティ並びで表現される
  const leading = PARITY_PATTERNS.indexOf(parity.join(""));
  assert.ok(leading !== -1, `パリティパターンが不正: ${parity.join("")}`);
  return String(leading) + left.join("") + right.join("");
}

describe("normalizeInput", () => {
  it("ハイフン・空白を取り除く", () => {
    assert.equal(normalizeInput("4912-3456 7890"), "491234567890");
  });

  it("全角数字を半角に変換する", () => {
    assert.equal(normalizeInput("４９１２３４５６７８９０"), "491234567890");
  });

  it("数字以外が含まれる場合は null", () => {
    assert.equal(normalizeInput("49123456789a"), null);
  });
});

describe("calcCheckDigit", () => {
  it("12桁からチェックディジットを計算する", () => {
    assert.equal(calcCheckDigit("491234567890"), "4");
    assert.equal(calcCheckDigit("590123412345"), "7");
    assert.equal(calcCheckDigit("456995111617"), "9");
  });
});

describe("encode", () => {
  it("12桁ならチェックディジットを補完する", () => {
    const result = encode("491234567890");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "4912345678904");
    assert.equal(result.barcode.checkDigit, "4");
    assert.equal(result.barcode.completed, true);
    assert.equal(result.warning, undefined);
  });

  it("13桁ならチェックディジットを照合する", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    assert.equal(result.barcode.completed, false);
    assert.equal(result.warning, undefined);
  });

  it("チェックディジットが誤っていれば訂正して警告する", () => {
    const result = encode("4912345678900");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "4912345678904");
    assert.match(result.warning ?? "", /Check digit was incorrect/);
  });

  it("モジュール列は95本になる", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    assert.equal(result.barcode.modules.length, 95);
  });

  it("ガードバーは開始3・中央5・終了3の位置にある", () => {
    const result = encode("4912345678904");
    assert.ok(result.ok);
    const guards = [...result.barcode.guardIndices].sort((a, b) => a - b);
    assert.deepEqual(guards, [0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  });
});

describe("encode: 入力エラー", () => {
  it("空文字はエラーになる", () => {
    const result = encode("");
    assert.equal(result.ok, false);
  });

  it("数字以外はエラーになる", () => {
    const result = encode("abc");
    assert.equal(result.ok, false);
  });

  it("対応しない桁数はエラーになる", () => {
    for (const input of ["1", "1234567", "12345678", "123456789", "12345678901234"]) {
      assert.equal(encode(input).ok, false, `${input} はエラーになるべき`);
    }
  });
});

describe("エンコード結果のデコード（往復検証）", () => {
  const samples = ["4912345678904", "5901234123457", "4569951116179", "0000000000000", "9999999999994"];

  for (const code of samples) {
    it(`${code} を復元できる`, () => {
      const result = encode(code);
      assert.ok(result.ok, `${code} のエンコードに失敗`);
      assert.equal(decode(result.barcode.modules), result.barcode.code);
    });
  }

  it("先頭桁が異なればモジュール列も変わる（パリティが効いている）", () => {
    const a = encode("0123456789012");
    const b = encode("1123456789011");
    assert.ok(a.ok && b.ok);
    assert.equal(a.warning, undefined);
    assert.equal(b.warning, undefined);
    assert.notDeepEqual(a.barcode.modules, b.barcode.modules);
  });
});
