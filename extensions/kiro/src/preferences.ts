import { getPreferenceValues, Application } from "@raycast/api";

interface ExtensionPreferences {
  layout: "list" | "grid";
  keepSectionOrder: boolean;
  closeOtherWindows: boolean;
  terminalApp: Application;
  showGitBranch: boolean;
  gitBranchColor: string;
}

const preferences = getPreferenceValues<ExtensionPreferences>();

export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
export const showGitBranch = preferences.showGitBranch;
export const gitBranchColor = preferences.gitBranchColor;
