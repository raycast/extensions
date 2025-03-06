import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  showCopyTip: boolean;
  showLastCopy: boolean;
  showTabTitle: boolean;
  multiPathSeparator: string;
  copyUrlContent: string;
  copyWhenUnSupported: string;
}

export const { showCopyTip, showLastCopy, showTabTitle, multiPathSeparator, copyUrlContent, copyWhenUnSupported } =
  getPreferenceValues<Preferences>();
