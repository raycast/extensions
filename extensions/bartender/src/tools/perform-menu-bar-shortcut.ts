import { performMenuBarShortcut } from "../api";
import { getStoredShortcuts } from "../hooks";
import { Result } from "../types";
import { SearchResult } from "./search-menu-bar-shortcuts";

type Input = {
  /**
   * IMPORTANT: Must be a result object returned from the search-menu-bar-shortcuts tool.
   * Do not create this object manually.
   */
  searchResult: SearchResult;
};

/**
 * Executes a menu bar shortcut.
 *
 * IMPORTANT: First run search-menu-bar-shortcuts tool to get a valid searchResult.
 */
export default async function performMenuBarShortcutTool(input: Input): Promise<Result<void>> {
  const { searchResult } = input;

  if (!searchResult) {
    return {
      status: "error",
      error: "Valid shortcut search result is required",
    };
  }

  const allShortcuts = await getStoredShortcuts();
  const shortcut = allShortcuts.find((x) => x.menuBarId === searchResult.menuBarId && x.name === searchResult.name);

  if (!shortcut) {
    return {
      status: "error",
      error: `No matching shortcut found for "${searchResult.name}" and "${searchResult.menuBarId}"`,
    };
  }

  return await performMenuBarShortcut(shortcut);
}
