import { getLanguageFlag, supportedLanguagesByCode } from "./languages";
import { LanguageCodeSet } from "./types";

export const isSameLanguageSet = (langSet1: LanguageCodeSet, langSet2: LanguageCodeSet) => {
  return langSet1.langFrom === langSet2.langFrom && langSet1.langTo === langSet2.langTo;
};

export const getLanguageSetObjects = (languageSet: LanguageCodeSet) => {
  return {
    langFrom: supportedLanguagesByCode[languageSet.langFrom],
    langTo: supportedLanguagesByCode[languageSet.langTo],
  };
};

export const formatLanguageSet = (languageSet: LanguageCodeSet) => {
  const { langFrom, langTo } = getLanguageSetObjects(languageSet);
  return `${langFrom.name} ${getLanguageFlag(langFrom)} -> ${getLanguageFlag(langTo)} ${langTo.name}`;
};
