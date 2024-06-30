import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showTips: boolean;
  maxLines: string;
  removeDuplicates: boolean;
  primaryAction: string;
}

export const { showTips, maxLines, removeDuplicates, primaryAction } = getPreferenceValues<Preferences>();

export enum PrimaryAction {
  PASTE = "Paste",
  Copy = "Copy",
}
