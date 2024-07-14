import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  maxLines: string;
  removeDuplicates: boolean;
  rememberShellTag: boolean;
  primaryAction: string;
  showTips: boolean;
}

export const { maxLines, removeDuplicates, rememberShellTag, primaryAction, showTips } =
  getPreferenceValues<Preferences>();

export enum PrimaryAction {
  PASTE = "Paste",
  Copy = "Copy",
}
