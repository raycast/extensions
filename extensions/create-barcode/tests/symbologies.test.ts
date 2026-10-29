import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_DATA_LENGTH } from "../src/lib/barcode.ts";
import { encode as encodeCodabar } from "../src/lib/codabar.ts";
import { encode as encodeCode128 } from "../src/lib/code128.ts";
import { encode as encodeCode39 } from "../src/lib/code39.ts";
import { encode as encodeItf } from "../src/lib/itf.ts";
import { fileBaseName } from "../src/lib/filename.ts";
import { buildLayout } from "../src/lib/layout.ts";
import { renderSvg } from "../src/lib/svg.ts";
import { encodeAll } from "../src/lib/symbologies.ts";

/**
 * モジュール列を「要素の幅の並び」に戻す。
 * どのシンボロジーもバーとスペースが必ず交互になるので、
 * ラン長がそのまま規格の要素幅になる。
 */
function runLengths(modules: boolean[]): number[] {
  const runs: number[] = [];
  let current = modules[0];
  let length = 0;

  for (const module of modules) {
    if (module === current) {
      length++;
      continue;
    }
    runs.push(length);
    current = module;
    length = 1;
  }
  runs.push(length);
  return runs;
}

describe("ITF", () => {
  it("数字以外はエラーになる", () => {
    assert.equal(encodeItf("12A4").ok, false);
    assert.equal(encodeItf("").ok, false);
  });

  it("奇数桁は先頭に0を補う", () => {
    const result = encodeItf("123");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "0123");
    assert.equal(result.barcode.notice, "Leading Zero Added");
  });

  it("先頭はバーから始まる", () => {
    const result = encodeItf("1234");
    assert.ok(result.ok);
    assert.equal(result.barcode.modules[0], true);
  });

  it("2桁がバーとスペースに交互に振り分けられる", () => {
    const result = encodeItf("12");
    assert.ok(result.ok);

    // スタート（細4本）+ 1=WNNNW をバーに / 2=NWNNW をスペースに + ストップ（太細細）
    assert.deepEqual(runLengths(result.barcode.modules), [1, 1, 1, 1, 3, 1, 1, 3, 1, 1, 1, 1, 3, 3, 3, 1, 1]);
  });

  it("モジュール数は 9n + 9 になる", () => {
    for (const digits of ["12", "1234", "123456789012"]) {
      const result = encodeItf(digits);
      assert.ok(result.ok);
      assert.equal(result.barcode.modules.length, 9 * digits.length + 9, `${digits} のモジュール数`);
    }
  });
});

describe("NW-7 (Codabar)", () => {
  it("スタート／ストップが無ければ A で挟む", () => {
    const result = encodeCodabar("123");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "A123A");
    assert.equal(result.barcode.notice, "Start/Stop Added");
  });

  it("A〜D で挟まれていればそれを使う", () => {
    const result = encodeCodabar("c123d");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "C123D");
    assert.equal(result.barcode.notice, undefined);
  });

  it("扱えない文字はエラーになる", () => {
    assert.equal(encodeCodabar("12*34").ok, false);
    assert.equal(encodeCodabar("ABC").ok, false);
    assert.equal(encodeCodabar("").ok, false);
  });

  it("スタート文字 A のパターンで始まる", () => {
    const result = encodeCodabar("1");
    assert.ok(result.ok);
    // A = 0011010（細細太太細太細）
    assert.deepEqual(runLengths(result.barcode.modules).slice(0, 7), [1, 1, 3, 3, 1, 3, 1]);
  });

  it("モジュール数は各文字の幅 + 文字間の細スペース", () => {
    const result = encodeCodabar("A123A");
    assert.ok(result.ok);
    // A/D 系は 13X、数字は 11X、文字間の区切りが 4本
    assert.equal(result.barcode.modules.length, 13 + 11 * 3 + 13 + 4);
  });

  /**
   * NW-7 のパターン表を、規格で決まっている太バー・太スペースの組み合わせ方から検証する。
   *
   * - 0〜9 と - $ …… 太いバー1本 + 太いスペース1本。バー4×スペース3 の12通りを1つずつ使う
   * - : / . + …… バー4本のうち3本が太い（4通りを1つずつ）
   * - A〜D …… 太いバー1本 + 太いスペース2本
   */
  it("パターン表の太バー・太スペースの組み合わせが規格どおり", () => {
    const positions = (widths: number[]) => ({
      bars: widths.filter((_, i) => i % 2 === 0).flatMap((w, i) => (w === 3 ? [i] : [])),
      spaces: widths.filter((_, i) => i % 2 === 1).flatMap((w, i) => (w === 3 ? [i] : [])),
    });

    const dataPairs = new Set<string>();
    for (const char of "0123456789-$") {
      const { bars, spaces } = positions(codabarWidths(char));
      assert.equal(bars.length, 1, `${char} の太いバーは1本のはず`);
      assert.equal(spaces.length, 1, `${char} の太いスペースは1本のはず`);
      dataPairs.add(`${bars[0]},${spaces[0]}`);
    }
    // バー4箇所 × スペース3箇所 = 12通りがすべて重複なく使われる
    assert.equal(dataPairs.size, 12);

    const symbolPatterns = new Set<string>();
    for (const char of ":/.+") {
      const { bars, spaces } = positions(codabarWidths(char));
      assert.equal(bars.length, 3, `${char} の太いバーは3本のはず`);
      assert.equal(spaces.length, 0, `${char} に太いスペースは無いはず`);
      symbolPatterns.add(bars.join(","));
    }
    assert.equal(symbolPatterns.size, 4);

    const startStopPatterns = new Set<string>();
    for (const char of "ABCD") {
      const { bars, spaces } = positions(codabarWidths(char));
      assert.equal(bars.length, 1, `${char} の太いバーは1本のはず`);
      assert.equal(spaces.length, 2, `${char} の太いスペースは2本のはず`);
      startStopPatterns.add(`${bars[0]},${spaces.join(",")}`);
    }
    assert.equal(startStopPatterns.size, 4);
  });
});

/** NW-7 の1文字ぶんの要素幅を取り出す */
function codabarWidths(char: string): number[] {
  // A〜D はスタート／ストップ専用なので、その位置に置いて先頭から読む
  if ("ABCD".includes(char)) {
    const result = encodeCodabar(`${char}1${char}`);
    assert.ok(result.ok, `${char} を符号化できない`);
    return runLengths(result.barcode.modules).slice(0, 7);
  }

  const result = encodeCodabar(`A${char}A`);
  assert.ok(result.ok, `${char} を符号化できない`);
  // スタートの A（7要素 + 区切り1要素）の後ろが対象の文字
  return runLengths(result.barcode.modules).slice(8, 15);
}

describe("CODE39", () => {
  it("小文字は大文字に直す", () => {
    const result = encodeCode39("abc-1");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "ABC-1");
  });

  it("扱えない文字はエラーになる", () => {
    assert.equal(encodeCode39("ABC!").ok, false);
    assert.equal(encodeCode39("A*B").ok, false);
    assert.equal(encodeCode39("").ok, false);
  });

  it("スタート／ストップの * パターンで挟まれる", () => {
    const result = encodeCode39("A");
    assert.ok(result.ok);
    const runs = runLengths(result.barcode.modules);
    // * = 010010100（細太細細太細太細細）
    assert.deepEqual(runs.slice(0, 9), [1, 3, 1, 1, 3, 1, 3, 1, 1]);
    assert.deepEqual(runs.slice(-9), [1, 3, 1, 1, 3, 1, 3, 1, 1]);
  });

  it("モジュール数は 16n + 31 になる", () => {
    for (const data of ["A", "AB", "CODE 39"]) {
      const result = encodeCode39(data);
      assert.ok(result.ok);
      assert.equal(result.barcode.modules.length, 16 * data.length + 31, `${data} のモジュール数`);
    }
  });

  /**
   * CODE39 のパターン表を規格の組み立て方から導き出して突き合わせる。
   *
   * - バー5本の太細は「2 of 5」（ITF と同じ）の10通り
   * - スペース4本のうち太は1本で、その位置が10文字ごとに変わる
   * - $ / + % だけは例外で、バーは全部細・スペースの3本が太
   *
   * 実装のテーブルを写さずに検証できるので、1文字でも取り違えていれば落ちる。
   */
  it("パターン表が規格の組み立て方と一致する", () => {
    const TWO_OF_FIVE = ["00110", "10001", "01001", "11000", "00101", "10100", "01100", "00011", "10010", "01010"];
    // 値 0-9 / 10-19 / 20-29 / 30-39 の順に、太いスペースの位置がずれていく
    const SPACE_PATTERNS = ["0100", "0010", "0001", "1000"];
    const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. ";
    // 例外の4文字（バーは全部細く、スペース3本が太い）
    const SPECIALS: Record<string, string> = {
      $: "1110",
      "/": "1101",
      "+": "1011",
      "%": "0111",
    };

    for (const [value, char] of Array.from(CHARS).entries()) {
      // 値 0-9 は 2 of 5 の並びどおり、それ以降のグループは 1,2,…,9,0 の順に対応する
      const group = Math.floor(value / 10);
      const indexInGroup = value % 10;
      const bars = TWO_OF_FIVE[group === 0 ? indexInGroup : (indexInGroup + 1) % 10];
      assertCode39Pattern(char, bars, SPACE_PATTERNS[group]);
    }

    for (const [char, spaces] of Object.entries(SPECIALS)) {
      assertCode39Pattern(char, "00000", spaces);
    }
  });
});

/** 1文字を CODE39 で符号化し、期待するバー／スペースの太細と突き合わせる */
function assertCode39Pattern(char: string, bars: string, spaces: string): void {
  // スタートの * と A を挟んでおけば、空白文字も trim されずに符号化される
  const result = encodeCode39(`A${char}A`);
  assert.ok(result.ok, `${char} を符号化できない`);

  // * と A（9要素 + 区切り1要素）の後ろが対象の文字
  const runs = runLengths(result.barcode.modules).slice(20, 29);
  const expected = Array.from({ length: 9 }, (_, i) =>
    (i % 2 === 0 ? bars[i / 2] : spaces[(i - 1) / 2]) === "1" ? 3 : 1,
  );
  assert.deepEqual(runs, expected, `${char} のパターン`);
}

describe("CODE128", () => {
  /** 規格で決まっているスタート／ストップの要素幅 */
  const START_B = [2, 1, 1, 2, 1, 4];
  const START_C = [2, 1, 1, 2, 3, 2];
  const STOP = [2, 3, 3, 1, 1, 1, 2];

  it("印字可能な ASCII 以外はエラーになる", () => {
    assert.equal(encodeCode128("バーコード").ok, false);
    assert.equal(encodeCode128("").ok, false);
  });

  it("英字を含む場合はコードセット B で始まる", () => {
    const result = encodeCode128("Wikipedia");
    assert.ok(result.ok);
    assert.deepEqual(runLengths(result.barcode.modules).slice(0, 6), START_B);
  });

  it("Wikipedia のチェックディジットは 88 になる", () => {
    const result = encodeCode128("Wikipedia");
    assert.ok(result.ok);
    assert.equal(result.barcode.checkDigit, "88");

    // 値 88 のパターン（421211）がストップの直前に入る
    const runs = runLengths(result.barcode.modules);
    assert.deepEqual(runs.slice(-13, -7), [4, 2, 1, 2, 1, 1]);
    assert.deepEqual(runs.slice(-7), STOP);
  });

  it("数字だけならコードセット C で2桁ずつ詰める", () => {
    const result = encodeCode128("1234567890");
    assert.ok(result.ok);
    assert.deepEqual(runLengths(result.barcode.modules).slice(0, 6), START_C);
    // スタート + 5シンボル + チェックディジット = 7、これにストップの 13X が付く
    assert.equal(result.barcode.modules.length, 11 * 7 + 13);
    assert.equal(result.barcode.notice, "Code Set C Used");
  });

  it("長い数字列の手前でコードセット C に切り替える", () => {
    const result = encodeCode128("AB1234567890");
    assert.ok(result.ok);
    assert.deepEqual(runLengths(result.barcode.modules).slice(0, 6), START_B);
    // スタート + A + B + 切り替え + 5シンボル + チェックディジット = 10
    assert.equal(result.barcode.modules.length, 11 * 10 + 13);
  });

  it("モジュール数は 11 の倍数 + ストップの 13X になる", () => {
    for (const data of ["A", "Hello, World!", "12345", "a1b2c3"]) {
      const result = encodeCode128(data);
      assert.ok(result.ok);
      assert.equal((result.barcode.modules.length - 13) % 11, 0, `${data} のモジュール数`);
    }
  });
});

describe("encodeAll", () => {
  it("数字だけの入力はすべてのシンボロジーで通る", () => {
    const results = encodeAll("123456789012");
    assert.deepEqual(
      results.map((entry) => entry.result.ok),
      [true, true, true, true, true],
    );
  });

  it("英字を含む入力は CODE39 と CODE128 だけが通る", () => {
    const results = encodeAll("ABC-123");
    const passed = results.filter((entry) => entry.result.ok).map((entry) => entry.symbology.id);
    assert.deepEqual(passed, ["code39", "code128"]);
  });

  it("どのシンボロジーでも扱えない入力はすべて失敗する", () => {
    const results = encodeAll("バーコード");
    assert.ok(results.every((entry) => !entry.result.ok));
  });
});

describe("レイアウトと SVG（全シンボロジー）", () => {
  const inputs = ["4912345678904", "A12-34$B", "CODE 39", "Hello <World> & 128"];

  for (const input of inputs) {
    it(`${input} を描画できる`, () => {
      for (const entry of encodeAll(input)) {
        if (!entry.result.ok) {
          continue;
        }
        const layout = buildLayout(entry.result.barcode);

        // 文字列がシンボルからはみ出さない幅になっている
        const textWidth = entry.result.barcode.code.length * layout.charAdvance;
        assert.ok(layout.width >= textWidth, `${entry.symbology.id} の幅が文字列より狭い`);
        assert.ok(layout.bars.length > 0, `${entry.symbology.id} のバーが無い`);

        const svg = renderSvg(entry.result.barcode);
        assert.match(svg, /^<svg /);
        // & や < がそのまま出ると XML として壊れるので、実体参照になっていることを確かめる
        for (const [, content] of svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)) {
          assert.match(content, /^(?:[^<&]|&(?:amp|lt|gt|quot|apos);)*$/, `${entry.symbology.id} の SVG のエスケープ`);
        }
      }
    });
  }
});

describe("fileBaseName", () => {
  it("シンボロジーごとに接頭辞が付く", () => {
    const ean = encodeAll("4912345678904")[0].result;
    assert.ok(ean.ok);
    assert.equal(fileBaseName(ean.barcode), "EAN13_4912345678904");
  });

  it("ファイル名に使えない文字は落としてハッシュを添える", () => {
    const result = encodeCode128("A/B:C");
    assert.ok(result.ok);
    const name = fileBaseName(result.barcode);
    assert.match(name, /^CODE128_A-B-C_[0-9a-f]{8}$/);
  });
});

describe("入力の長さの上限", () => {
  it("上限ちょうどは通る", () => {
    assert.equal(encodeCode128("A".repeat(MAX_DATA_LENGTH)).ok, true);
    assert.equal(encodeCode39("A".repeat(MAX_DATA_LENGTH)).ok, true);
    assert.equal(encodeCodabar("1".repeat(MAX_DATA_LENGTH)).ok, true);
    assert.equal(encodeItf("1".repeat(MAX_DATA_LENGTH)).ok, true);
  });

  it("上限を超えるとエラーになる", () => {
    const over = MAX_DATA_LENGTH + 1;
    assert.equal(encodeCode128("A".repeat(over)).ok, false);
    assert.equal(encodeCode39("A".repeat(over)).ok, false);
    assert.equal(encodeCodabar("1".repeat(over)).ok, false);
    assert.equal(encodeItf("1".repeat(over)).ok, false);
  });

  it("上限まで入れてもプレビューの画素数が現実的な範囲に収まる", () => {
    // プレビューは 8倍解像度の PNG を同期的に組み立てる。
    // 上限がないとここが数百MBに膨らんで UI が固まる。
    const result = encodeCode128("A".repeat(MAX_DATA_LENGTH));
    assert.ok(result.ok);

    const layout = buildLayout(result.barcode);
    const pixels = layout.width * 8 * (layout.height * 8);
    assert.ok(pixels < 8 * 1024 * 1024, `${(pixels / 1024 / 1024).toFixed(1)}MB は大きすぎる`);
  });
});

describe("前後の空白", () => {
  it("CODE128 は前後の空白を落としたことを知らせる", () => {
    const result = encodeCode128(" AB ");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "AB");
    assert.equal(result.barcode.notice, "Spaces Trimmed");
  });

  it("CODE128 は文字列の内側の空白はそのまま符号化する", () => {
    const result = encodeCode128("A B");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "A B");
    assert.equal(result.barcode.notice, undefined);
  });

  it("CODE39 も内側の空白は残す", () => {
    const result = encodeCode39("A B");
    assert.ok(result.ok);
    assert.equal(result.barcode.code, "A B");
    assert.equal(result.barcode.notice, undefined);
  });

  it("注記が複数あるときは中黒でつなぐ", () => {
    const trimmedAndUppercased = encodeCode39(" ab ");
    assert.ok(trimmedAndUppercased.ok);
    assert.equal(trimmedAndUppercased.barcode.notice, "Spaces Trimmed · Uppercased");

    const trimmedAndCodeSetC = encodeCode128(" 1234 ");
    assert.ok(trimmedAndCodeSetC.ok);
    assert.equal(trimmedAndCodeSetC.barcode.notice, "Spaces Trimmed · Code Set C Used");
  });
});
