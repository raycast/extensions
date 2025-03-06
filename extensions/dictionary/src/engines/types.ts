import { supportedEngine, dependenciesEngine } from "../constants";
import { DefItem, DefListRts, DefsBody, LanguageCode } from "../types";

export type EngineID = keyof typeof supportedEngine | DepEngineID;
export type DepEngineID = keyof typeof dependenciesEngine;
export interface EngineHookProps<R, T> {
  key: EngineID;
  title: string;
  baseUrl: string;
  fallbackSearch?: boolean;
  getDetailEngine?: EngineHookProps<object, object>;
  getUrl: (query: string) => RequestInfo;
  getOpts?: (query: string, to: LanguageCode, apiKey?: string, from?: LanguageCode) => RequestInit;
  parseTTS?: (query: string, transCode: LanguageCode, data: R) => Promise<[string, string?]>;
  parseData: (data: R) => DefsBody<T>;
  parseDef: (item: T) => DefItem | DefItem[];
  parsePos?: (item: T) => string;
  parseExtras?: (data: R, transCode?: LanguageCode) => DefListRts;
  getEmptyViewProps?: (lang: LanguageCode, query: string) => { title: string; description: string };
}
