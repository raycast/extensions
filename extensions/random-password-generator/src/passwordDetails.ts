import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import zxcvbnEnPackage from "@zxcvbn-ts/language-en";

const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
};

zxcvbnOptions.setOptions(options);

export function getPasswordDetails(password: string) {
  const result = zxcvbn(password);
  const sequence = result.sequence;

  return {
    crackTime: result.crackTimesDisplay.offlineFastHashing1e10PerSecond,
    score: result.score,
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
    sequence,
  };
}
