import { getPreferenceValues } from "@raycast/api";

export const {
  trimText,
  isShowHud,
  preferredTerminal,
  fileAction,
  folderAction,
  urlAction,
  priorityDetection,
  searchEngine,
} = getPreferenceValues<Preferences>();

export interface OpenInArguments {
  openIn: string;
}
export enum OpenIn {
  FINDER = "Finder | Browser",
  TERMINAL = "Terminal",
}
