/**
 * Shared constants and data for the forScore extension
 * This file demonstrates how to export data for use across different commands
 */

export const FORSCORE_BUNDLE_ID = "com.mgsdevelopment.forscore";
export const FORSCORE_WEBSITE = "https://forscore.co";

/**
 * Available forScore URL scheme actions
 */
export const FORSCORE_ACTIONS = {
  NEXT_PAGE: "forscore://action?type=nextpage",
  PREV_PAGE: "forscore://action?type=prevpage",
  NEXT_ITEM: "forscore://action?type=nextitem",
  PREV_ITEM: "forscore://action?type=previtem",
  GO_TO_PAGE: (page: number) => `forscore://open?page=${page}`,
} as const;

/**
 * Example of shared configuration data
 * You can add more shared data structures here as needed
 */
export const DEFAULT_CONFIG = {
  showHUD: true,
  checkInstallation: true,
} as const;
