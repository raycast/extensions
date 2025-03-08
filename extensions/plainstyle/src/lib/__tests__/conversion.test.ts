import { describe, expect, test } from "vitest";
import { convert } from "../conversion";
import { serif_bold, serif_italic, sans_serif_italic, monospace, wide, circled_white } from "../sets";
import { REGULAR } from "./cases";

describe("conversion", () => {
  test("Character mapping is created correctly", () => {
    // 各文字セットのマッピングが正しく作成されているか確認
    const letterSets = [serif_bold, sans_serif_italic, monospace, wide, circled_white];

    for (const letterSet of letterSets) {
      // 各文字セットのcharactersオブジェクトのキーの数を確認
      const characterCount = Object.keys(letterSet.characters).length;
      expect(characterCount).toBeGreaterThan(0);

      // いくつかのマッピングをサンプルチェック
      if (letterSet === wide) {
        expect(letterSet.characters["A"]).toBe("Ａ");
        expect(letterSet.characters["1"]).toBe("１");
      }

      if (letterSet === circled_white) {
        expect(letterSet.characters["A"]).toBe("Ⓐ");
        expect(letterSet.characters["1"]).toBe("①");
      }
    }
  });

  // REGULARの全文字を使った変換テスト
  test("Full REGULAR string conversion to different styles", () => {
    // 各スタイルへの変換をテスト
    const styles = [
      { name: "serif_bold", set: serif_bold },
      { name: "serif_italic", set: serif_italic },
      { name: "monospace", set: monospace },
      { name: "wide", set: wide },
      { name: "circled_white", set: circled_white },
    ];

    for (const style of styles) {
      // REGULAR全体を変換
      const result = convert(REGULAR, style.set);
      const regularChars = [...REGULAR];
      const resultChars = [...result];

      console.log(`Converting full REGULAR to ${style.name}`);
      console.log(`REGULAR chars: ${regularChars.length}, Result chars: ${resultChars.length}`);

      // 各文字が正しく変換されているか確認
      // REGULARの各文字について、変換マップに存在する場合は変換され、存在しない場合はそのままであることを確認
      for (let i = 0; i < regularChars.length; i++) {
        const regularChar = regularChars[i];
        const resultChar = resultChars[i];

        // 変換マップに存在する文字は変換されるはず
        if (style.set.characters[regularChar]) {
          expect(resultChar).toBe(style.set.characters[regularChar]);
        } else {
          // マップに存在しない文字はそのまま
          expect(resultChar).toBe(regularChar);
        }
      }

      // 変換されない文字はそのまま残るはず
      const unchangedChar = "!"; // REGULARに含まれていない文字
      const unchangedResult = convert(unchangedChar, style.set);
      expect(unchangedResult).toBe(unchangedChar);
    }
  });
});
