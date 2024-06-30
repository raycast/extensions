import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showTips: boolean;
  maxLines: string;
  removeDuplicates: boolean;
  rememberShellTag: boolean;
  primaryAction: string;
}

export const { showTips, maxLines, removeDuplicates, rememberShellTag, primaryAction } =
  getPreferenceValues<Preferences>();

export enum PrimaryAction {
  PASTE = "Paste",
  Copy = "Copy",
}
