import { Application, getPreferenceValues } from "@raycast/api";

export interface Preference {
  trimText: boolean;
  isShowHud: boolean;
  preferredTerminal: Application;
  fileAction: string;
  urlAction: string;
  priorityDetection: string;
  searchEngine: string;
}

export const { trimText, isShowHud, preferredTerminal, fileAction, urlAction, priorityDetection, searchEngine } =
  getPreferenceValues<Preference>();

export interface OpenInArguments {
  openIn: string;
}
export enum OpenIn {
  FINDER = "Finder | Browser",
  TERMINAL = "Terminal",
}
