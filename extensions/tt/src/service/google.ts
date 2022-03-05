import { base64 } from "../util/base64";
import { TranslateListItemData, TranslateOption, TranslateService } from "./type";
import translate from "@vitalets/google-translate-api";

const search = async (options: TranslateOption): Promise<string> => {
  const { source: from, target: to, text } = options;

  return translate(text, { from, to }).then((response) => response.text);
};
const createListItem = (text: string): TranslateListItemData => {
  return {
    text,
    service: "구글",
    key: base64(text) || "id",
    icon: ICON,
  };
};
const id = "google";
const getSiteTranslationUrl = (options: TranslateOption, url: string) => {
  return "";
};
const ICON = "https://www.google.com/favicon.ico";

export const google: TranslateService = {
  id,
  search,
  createListItem,
  getSiteTranslationUrl,
}