import { getPreferenceValues } from "@raycast/api";

export const { maxLines, historyTimestamp, removeDuplicates, rememberShellTag, primaryAction, showTips } =
  getPreferenceValues<Preferences.Index>();

export enum PrimaryAction {
  PASTE = "Paste",
  Copy = "Copy",
}
