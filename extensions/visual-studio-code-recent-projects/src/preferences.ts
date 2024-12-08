import { getPreferenceValues } from "@raycast/api";
import { VSCodeBuild } from "./types";

const preferences = getPreferenceValues<ExtensionPreferences>();

function getBundleIdentifier() {
  switch (preferences.build) {
    case VSCodeBuild.Code:
      return "com.microsoft.VSCode";
    case VSCodeBuild.Insiders:
      return "com.microsoft.VSCodeInsiders";
    case VSCodeBuild.VSCodium:
      return "VSCodium";
    case VSCodeBuild.Cursor:
      return "Cursor";
    case VSCodeBuild.Windsurf:
      return "Windsurf";
  }
}

export const build = preferences.build;
export const bundleIdentifier = getBundleIdentifier();
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
export const showGitBranch = preferences.showGitBranch;
export const gitBranchColor = preferences.gitBranchColor;
