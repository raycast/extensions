import { getPreferenceValues } from "@raycast/api";

/**
 * Preferences
 */
const preferences = getPreferenceValues<ExtensionPreferences>();

/**
 * [show-recent-projects-in-menu-bar.command] Preferences
 */
export const showRecentProjectsInMenuBarCommandPreferences =
  preferences as Preferences.ShowRecentProjectsInMenuBarCommand;

/**
 * [search-recent-projects.command] Preferences
 */
export const searchRecentProjectsCommandPreferences = preferences as Preferences.SearchRecentProjectsCommand;

/**
 * [create-swift-playground.command] Preferences
 */
export const createSwiftPlaygroundCommandPreferences = preferences as Preferences.CreateSwiftPlaygroundCommand;
