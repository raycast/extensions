import { getPreferenceValues } from "@raycast/api";

type CopyUrlContent = "Original" | "Protocol://host/pathname" | "Protocol://host" | "Host";

type CopyWhenUnSupported = "none" | "windowTitle" | "appName" | "appPath" | "bundleId";

type UrlCleanupMode = "none" | "removeTracking" | "removeQueryAndFragment";

type Preferences = {
  showCopyTip: boolean;
  showLastCopy: boolean;
  showTabTitle: boolean;
  multiPathSeparator: string;
  copyUrlContent: CopyUrlContent;
  copyWhenUnSupported: CopyWhenUnSupported;
  urlCleanupMode: UrlCleanupMode;
};

export const {
  showCopyTip,
  showLastCopy,
  showTabTitle,
  multiPathSeparator,
  copyUrlContent,
  copyWhenUnSupported,
  urlCleanupMode,
} = getPreferenceValues<Preferences>();
