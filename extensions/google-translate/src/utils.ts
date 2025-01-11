import { getLanguageFlag, supportedLanguagesByCode } from "./languages";
import { LanguageCodeSet } from "./types";

export const isSameLanguageSet = (langSet1: LanguageCodeSet, langSet2: LanguageCodeSet) => {
  return langSet1.langFrom === langSet2.langFrom && langSet1.langTo.join() === langSet2.langTo.join();
};

export const getLanguageSetObjects = (languageSet: LanguageCodeSet) => {
  return {
    langFrom: supportedLanguagesByCode[languageSet.langFrom],
    langTo: languageSet.langTo.map((l) => supportedLanguagesByCode[l]),
  };
};

export const formatLanguageSet = (languageSet: LanguageCodeSet) => {
  const { langFrom, langTo } = getLanguageSetObjects(languageSet);
  const langToArr = Array.isArray(langTo) ? langTo : [langTo];
  const languageLabels = langToArr.map((l) => `${getLanguageFlag(l)} ${l.name}`);
  return `${langFrom.name} ${getLanguageFlag(langFrom)} -> ${languageLabels.join(", ")}`;
};
