import { getPreferenceValues } from "@raycast/api";

export const {
  showHudEmoji,
  showCopyTip,
  showLastCopy,
  showTabTitle,
  multiPathSeparator: separator,
  copyUrlContent,
  copyWhenUnSupported,
} = getPreferenceValues<Preferences>();

// Escape the manifest value for Raycast's type generator; older saved values already contain a newline.
export const multiPathSeparator = separator.replace("\\n", "\n");
