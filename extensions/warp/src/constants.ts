/**
 * Global constants for the Warp extension
 */
import { getPreferenceValues } from "@raycast/api";

// Get the app name based on the selected release
export const getAppName = (): string => {
  const { warpApp } = getPreferenceValues<ExtensionPreferences>();
  return warpApp === "preview" ? "Warp Preview" : "Warp";
};

// URL for Warp Tab Configs Docs
export const CONFIGS_URL = "https://docs.warp.dev/terminal/windows/tab-configs/";

// Error and information messages
export const NO_CONFIGS_TITLE = "No Tab Configs found";
export const NO_CONFIGS_MESSAGE = "You need to create at least one Tab Config before launching.";

// Action titles
export const VIEW_DOCS_ACTION_TITLE = "View Tab Config Docs";
export const OPEN_CONFIGS_DIR_ACTION_TITLE = "Open Tab Configs Directory";
