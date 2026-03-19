import path from "node:path";

import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

export type KanaConversion = {
  normalizedInput: string;
  hiragana: string;
  katakana: string;
};

let converterPromise: Promise<Kuroshiro> | undefined;

async function getConverter() {
  if (!converterPromise) {
    const kuroshiro = new Kuroshiro();
    const dictPath = path.join(
      path.dirname(require.resolve("kuromoji/package.json")),
      "dict",
    );

    converterPromise = kuroshiro
      .init(new KuromojiAnalyzer({ dictPath }))
      .then(() => kuroshiro);
  }

  return converterPromise;
}

export async function convertJapaneseToKana(
  input: string,
): Promise<KanaConversion> {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return {
      normalizedInput,
      hiragana: "",
      katakana: "",
    };
  }

  const converter = await getConverter();
  const [hiragana, katakana] = await Promise.all([
    converter.convert(normalizedInput, { to: "hiragana" }),
    converter.convert(normalizedInput, { to: "katakana" }),
  ]);

  return {
    normalizedInput,
    hiragana,
    katakana,
  };
}
