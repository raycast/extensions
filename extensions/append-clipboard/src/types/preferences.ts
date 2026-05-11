import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  appendSeparator: string;
  trimBeforeAppendClipboardText: boolean;
  trimBeforeAppendSelectedText: boolean;
  trimAfterAppend: boolean;
  trimBeforeMerging: boolean;
  trimAfterMerging: boolean;
  copyAfterMerging: boolean;
  pasteAfterMerging: boolean;
}

export const {
  appendSeparator,
  trimBeforeAppendClipboardText,
  trimBeforeAppendSelectedText,
  trimAfterAppend,
  trimBeforeMerging,
  trimAfterMerging,
  copyAfterMerging,
  pasteAfterMerging,
} = getPreferenceValues<Preferences>();
