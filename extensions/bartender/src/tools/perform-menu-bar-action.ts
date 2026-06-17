import { performMenuBarAction as executeMenuBarAction } from "../api";
import { Result } from "../types";
import { ToolActionType } from "./types";

type Input = {
  actionType: ToolActionType;

  /**
   * IMPORTANT: Must be a result object returned from the search-menu-bar-apps tool.
   * Do not create this object manually.
   */
  searchResult: {
    name?: string;
    menuBarId: string;
    score: string;
  };
};

/**
 * Performs actions on menu bar items.
 *
 * IMPORTANT: First run search-menu-bar-apps tool to get a valid searchResult.
 */
export default async function performMenuBarAction(input: Input): Promise<Result<void>> {
  const { searchResult, actionType } = input;

  if (!searchResult || !searchResult.menuBarId || searchResult.menuBarId.trim() === "") {
    return {
      status: "error",
      error: "Search result with valid menu bar ID is required",
    };
  }

  if (!actionType) {
    return {
      status: "error",
      error: "Action type must be specified",
    };
  }

  return await executeMenuBarAction(searchResult.menuBarId, actionType);
}
