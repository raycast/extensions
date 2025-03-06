import { getPreferenceValues } from "@raycast/api";
import { getBundleId } from "./utils/editor";

const preferences = getPreferenceValues<ExtensionPreferences>();

function getBundleIdentifier() {
  return getBundleId(preferences.build);
}

export const build = preferences.build;
export const bundleIdentifier = getBundleIdentifier();
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
export const showGitBranch = preferences.showGitBranch;
export const gitBranchColor = preferences.gitBranchColor;
