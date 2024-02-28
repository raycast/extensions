import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showCopyTip: boolean;
  showErrorTip: boolean;
  showLastCopy: boolean;
  multiPathSeparator: string;
  copyUrlContent: string;
}

export const { showCopyTip, showErrorTip, showLastCopy, multiPathSeparator, copyUrlContent } =
  getPreferenceValues<Preferences>();
