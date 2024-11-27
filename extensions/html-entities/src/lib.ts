import { EntitiesResponse } from "./types";

export function filterEntities(entities: EntitiesResponse, searchText: string) {
  const filtered = Object.entries(entities).filter((entity) => {
    const [name, details] = entity;

    if (!name.endsWith(";")) return false;

    return searchText
      ? name.toLowerCase().includes(searchText.toLowerCase()) ||
          details.characters.toLowerCase().includes(searchText.toLowerCase()) ||
          details.codepoints.includes(parseInt(searchText))
      : true;
  });

  filtered.sort((a, b) => sortEntities(a, b, searchText));

  return filtered;
}

function sortEntities(
  a: [string, EntitiesResponse[string]],
  b: [string, EntitiesResponse[string]],
  searchText: string,
) {
  // Remove & and ; from search text
  searchText = searchText.replace(/&/, "").replace(/;/, "");

  let [nameA] = a;
  let [nameB] = b;

  nameA = nameA.replace(/&/, "").replace(/;/, "");
  nameB = nameB.replace(/&/, "").replace(/;/, "");

  // Exact case-sensitive matches first
  if (nameA === searchText) return -1;
  if (nameB === searchText) return 1;

  const searchLower = searchText.toLowerCase();

  // Exact case-insensitive matches next
  if (nameA.toLowerCase() === searchLower) return -1;
  if (nameB.toLowerCase() === searchLower) return 1;

  // Then starts with matches
  if (nameA.toLowerCase().startsWith(searchLower)) return -1;
  if (nameB.toLowerCase().startsWith(searchLower)) return 1;

  return 0;
}
