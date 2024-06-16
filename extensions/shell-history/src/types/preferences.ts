import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  maxLines: string;
  removeDuplicates: boolean;
  primaryAction: string;
}

export const { maxLines, removeDuplicates, primaryAction } = getPreferenceValues<Preferences>();

export enum PrimaryAction {
  PASTE = "Paste",
  Copy = "Copy",
}
export const secondaryAction = primaryAction === PrimaryAction.PASTE ? PrimaryAction.Copy : PrimaryAction.PASTE;
