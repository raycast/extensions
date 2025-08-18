import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const build = preferences.build;
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
export const showGitBranch = preferences.showGitBranch;
export const gitBranchColor = preferences.gitBranchColor;
