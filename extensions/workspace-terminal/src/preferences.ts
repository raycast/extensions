import { getPreferenceValues } from "@raycast/api";

import type { ExtensionPreferences } from "./types";

export function getExtensionPreferences(): ExtensionPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return {
    ...preferences,
    terminalType: preferences.terminalType ?? "ghostty",
    commandMode: preferences.commandMode ?? "keepShell",
    shellPath: preferences.shellPath?.trim() || "/bin/zsh",
    groupProjectsByTag: preferences.groupProjectsByTag ?? true,
    hideProjectsWithoutTag: preferences.hideProjectsWithoutTag ?? false,
    hideProjectsNotEnabled: preferences.hideProjectsNotEnabled ?? false,
    reuseWindow: preferences.reuseWindow ?? false,
  };
}
