/**
 * Global constants for the Warp extension
 */
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  warpApp: "stable" | "preview";
}

// Get the app name based on the selected release
export const getAppName = (): string => {
  const { warpApp } = getPreferenceValues<Preferences>();
  return warpApp === "preview" ? "Warp Preview" : "Warp";
};

// URL for Warp Launch Configurations Docs
export const LAUNCH_CONFIGS_URL = "https://docs.warp.dev/features/sessions/launch-configurations";

// Error and information messages
export const NO_LAUNCH_CONFIGS_TITLE = "No Launch Configurations found";
export const getNoLaunchConfigsMessage = (): string => {
  return `You need to create at least one Launch Configuration before launching.`;
};

// Action titles
export const VIEW_DOCS_ACTION_TITLE = "View Launch Configuration Docs";
export const OPEN_CONFIGS_DIR_ACTION_TITLE = "Open Launch Configurations Directory";
