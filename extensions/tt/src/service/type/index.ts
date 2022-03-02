import { Messanger } from "../../context/MessageContext";

export type TranslateListItemData = {
  key: string;
  text: string;
  icon: string;
  service: string;
};

export type TranslateOption = {
  source: "en" | string;
  target: "ko" | string;
  text: string;
};

export type TranslateService = {
  id: string;
  search(options: TranslateOption, m: Messanger): Promise<string>;
  createListItem(text: string): TranslateListItemData;
  getSiteTranslationUrl(options: TranslateOption, url: string): string;
};
