import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  layout: "list" | "grid";
  keepSectionOrder: boolean;
  closeOtherWindows: boolean;
  terminalApp?: { name: string; path: string };
  showGitBranch: boolean;
  gitBranchColor: string;
}

export const {
  layout = "list",
  keepSectionOrder = false,
  closeOtherWindows = false,
  terminalApp,
  showGitBranch = true,
  gitBranchColor = "",
} = getPreferenceValues<Preferences>();
