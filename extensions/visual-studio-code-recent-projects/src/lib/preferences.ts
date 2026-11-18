import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

function migrateBuildName(value: unknown): string {
  // Preference value stays "Antigravity" so existing settings keep working,
  // but the app was rebranded to "Antigravity IDE".
  if (value === "Antigravity") {
    return "Antigravity IDE";
  }
  return value as string;
}

export const build = migrateBuildName(preferences.build);
export const layout = preferences.layout;
export const keepSectionOrder = preferences.keepSectionOrder;
export const closeOtherWindows = preferences.closeOtherWindows;
export const terminalApp = preferences.terminalApp;
export const openInNewTerminalTab = preferences.openInNewTerminalTab;
export const showGitBranch = preferences.showGitBranch;
export const gitBranchColor = preferences.gitBranchColor;
