import Fuse from "fuse.js";
import { fetchAllMenuBarDetail, fetchMenuBarIdsFromBartender } from "../api";
import { Result } from "../types";

type Input = {
  searchTerm: string;
};

type SearchResult = {
  name?: string;
  menuBarId: string;
  score: string;
};

export default async function searchMenuBarApps({ searchTerm }: Input): Promise<Result<SearchResult[]>> {
  if (!searchTerm || searchTerm.trim() === "") {
    return {
      status: "error",
      error: "Search term cannot be empty",
    };
  }

  const allItems = await fetchMenuBarIdsFromBartender();
  if (allItems.status === "error") {
    return allItems;
  }

  let menuBarItems;
  try {
    menuBarItems = await fetchAllMenuBarDetail(allItems.data);
  } catch (error) {
    return {
      status: "error",
      error: `Failed to fetch menu bar details: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const fuse = new Fuse(menuBarItems, {
    keys: [
      { name: "name", weight: 1 },
      { name: "menuBarId", weight: 0.5 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  const searchResults = fuse.search(searchTerm);
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
