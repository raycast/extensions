import { getPreferenceValues } from "@raycast/api";

export const {
  layout = "list",
  keepSectionOrder = false,
  closeOtherWindows = false,
  terminalApp,
  showGitBranch = true,
  gitBranchColor = "",
} = getPreferenceValues();
