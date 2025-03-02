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
        // improve the performance by importing pinyin in runtime
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pinyin = require("pinyin").default; // import pinyin from 'pinyin'
        const pinyinCollection = pinyin(char, { style: pinyin.STYLE_NORMAL });
        return formatted.replace(char, pinyinCollection.join("") + " ");
      }, text);
    } else {
      return text;
    }
  }
}
