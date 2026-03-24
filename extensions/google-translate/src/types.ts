import { LanguageCode } from "./languages";

export type LanguageCodeSet = {
  langFrom: LanguageCode;
  langTo: LanguageCode[];
  proxy?: string;
};
