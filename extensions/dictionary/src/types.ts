import { Image, List } from "@raycast/api";
import { supportedLanguages } from "./constants";
export type LanguageCode = keyof typeof supportedLanguages;
export type LanguageTitle = (typeof supportedLanguages)[LanguageCode]["title"];
export type Language = {
  key: LanguageCode;
  title: LanguageTitle;
  icon?: Image.ImageLike;
};
type GenericMetaDataVal = string | number | boolean | { [x: string]: GenericMetaDataVal } | Array<GenericMetaDataVal>;
interface DefItemMeta {
  nestedView: {
    type: "detail" | "list" | "listDetail";
  };
  url: string;
  toClipboard: [string, string?];
  supportTTS: [string, string?];
}
export interface DefsBody<T> {
  src?: LanguageCode;
  definitions: T[];
}
export interface DefItem {
  id?: string;
  title: string;
  subtitle?: string;
  markdown?: string;
  keywords?: string[];
  icon?: Image.ImageLike;
  accessories?: List.Item.Accessory[];
  metaData?: Partial<DefItemMeta> & { [key: string]: GenericMetaDataVal }; // TODO: to be more explicit
}
export type DefSection = { title: string; defItems: DefItem[] };
export type DefListRts = DefItem[] | DefSection[];
export interface DictionaryPreferences {
  googlapiKey: string;
  youdaoapiKey: string;
  youdaoapiClientId: string;
}
const isObjKey = <T extends object>(key: PropertyKey, obj: T): key is keyof T => {
  return key in obj;
};
const isDefSection = (props: DefItem | DefSection): props is DefSection => {
  return (props as DefSection).defItems !== undefined;
};
export { isDefSection, isObjKey };
