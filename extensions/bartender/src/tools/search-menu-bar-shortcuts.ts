import Fuse, { Expression, IFuseOptions } from "fuse.js";
import { fetchAllMenuBarDetail } from "../api";
import { getStoredShortcuts } from "../hooks";
import { Result } from "../types";

type Input = {
  /**
   * Search for shortcuts by shortcut name.
   */
  searchName?: string;

  /**
   * Search for shortcuts by application name. Use with searchName for AND filtering.
   */
  searchAppName?: string;
};

export type SearchResult = {
  name: string;
  menuBarId: string;
  score: string;
};

type ShortcutSearchItem = {
  name: string;
  menuBarId: string;
  appName?: string;
};

type SearchParams =
  | { type: "none" }
  | { type: "nameOnly"; name: string }
  | { type: "appNameOnly"; appName: string }
  | { type: "both"; name: string; appName: string };

function getSearchParams(searchName: string | undefined, searchAppName: string | undefined): SearchParams {
  if (!searchName && !searchAppName) {
    return { type: "none" };
  }

  if (searchName && searchAppName) {
    return {
      type: "both",
      name: searchName,
      appName: searchAppName,
    };
  }

  if (searchName) {
    return {
      type: "nameOnly",
      name: searchName,
    };
  }

  if (searchAppName) {
    return {
      type: "appNameOnly",
      appName: searchAppName,
    };
  }
  return { type: "none" }; // Fallback case, should not be reached
}

export default async function searchMenuBarShortcuts({
  searchName,
  searchAppName,
}: Input): Promise<Result<SearchResult[]>> {
  const searchParams = getSearchParams(searchName, searchAppName);
  if (searchParams.type === "none") {
    return {
      status: "error",
      error: "No search parameters provided. Please provide a name or app name to search.",
    };
  }

  const expressions: Expression[] = [];

  function addSafe(value: string | undefined, ...keys: Array<keyof ShortcutSearchItem>) {
    value = value?.trim();
    if (value) {
      const orExpressions = keys.map((key) => ({ [key]: value }));
      expressions.push({ $or: orExpressions });
    }
  }

  switch (searchParams.type) {
    case "both":
      addSafe(searchParams.name, "name");
      addSafe(searchParams.appName, "appName", "menuBarId");
      break;
    case "nameOnly":
      addSafe(searchParams.name, "name", "menuBarId");
      break;
    case "appNameOnly":
      addSafe(searchParams.appName, "appName", "menuBarId");
      break;
    default:
      return searchParams satisfies never;
  }

  if (expressions.length === 0) {
    return {
      status: "error",
      error: "No valid search expressions generated. Please check your input.",
    };
  }

  const shortcuts = await getStoredShortcuts();

  let searchItems: ShortcutSearchItem[];
  let fuseOptions: IFuseOptions<ShortcutSearchItem>;

  if (searchParams.type === "both" || searchParams.type === "appNameOnly") {
    try {
      const menuBarDetails = await fetchAllMenuBarDetail(shortcuts.map((s) => s.menuBarId));

      searchItems = shortcuts.map((shortcut) => ({
        name: shortcut.name,
        menuBarId: shortcut.menuBarId,
        appName: menuBarDetails.find((detail) => detail.menuBarId === shortcut.menuBarId)?.name,
      }));

      const searchKeys = [
        { name: "menuBarId", weight: 0.5 },
        { name: "appName", weight: 1 },
      ];

      if (searchParams.type !== "appNameOnly") {
        searchKeys.unshift({ name: "name", weight: 1 });
      }

      fuseOptions = {
        includeScore: true,
        keys: searchKeys,
      };
    } catch (e) {
      return {
        status: "error",
        error: `Failed to fetch menu bar details. Error: ${e}`,
      };
    }
  } else {
    searchItems = shortcuts.map((shortcut) => ({
      name: shortcut.name,
      menuBarId: shortcut.menuBarId,
    }));

    fuseOptions = {
      includeScore: true,
      keys: [
        { name: "name", weight: 1 },
        { name: "menuBarId", weight: 0.5 },
      ],
    };
  }

  const fuse = new Fuse(searchItems, fuseOptions);
  const searchResults = fuse.search({ $and: expressions });

  const matchedItems: SearchResult[] = searchResults.map((result) => ({
    name: result.item.name,
    menuBarId: result.item.menuBarId,
    score: result.score !== undefined ? result.score.toFixed(6) : "1.000000",
  }));

  return {
    status: "success",
    data: matchedItems,
  };
}
