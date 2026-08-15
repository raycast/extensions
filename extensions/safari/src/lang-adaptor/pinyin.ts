import { pinyin } from "pinyin-pro";
import { LanguageHandler } from "./base";

export class PinyinHandler implements LanguageHandler {
  name = "pinyin";

  static readonly chineseChar = "[\\u4e00-\\u9fa5]+";

  private containChineseChar(text: string) {
    return new RegExp(PinyinHandler.chineseChar).test(text);
  }

  check(text: string, input: string): boolean {
    const userInputPinyin = !this.containChineseChar(input);
    return userInputPinyin && this.containChineseChar(text);
  }

  serialize(text: string): string {
    const chineseRegex = new RegExp(PinyinHandler.chineseChar, "g");
    const chineseChars = Array.from(text.matchAll(chineseRegex));
    if (chineseChars.length > 0) {
      return chineseChars.reduce((formatted, matchItem) => {
        const [char] = matchItem;
        const pinyinCollection = pinyin(char, { toneType: "none", type: "array", v: true });
        return formatted.replace(char, pinyinCollection.join("") + " ");
      }, text);
    } else {
      return text;
    }
  }
}
