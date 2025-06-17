import { getPreferenceValues } from "@raycast/api";

export const Browser = getPreferenceValues().browser.name as keyof typeof BrowserList;

export const BrowserList = {
  Arc: "https://arc.net/",
};

export interface NotebookLMTab {
  id: string;
  tokens?: Tokens;
}

export interface Tokens {
  at: string;
  bl: string;
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  location?: string;
}

export interface TabList {
  currentTab?: TabInfo;
  others: TabInfo[];
}

type RPCArg = unknown[];
export type RPCArgs = RPCArg[];
