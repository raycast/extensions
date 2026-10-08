import { Member, Space, SpaceObject, Tag } from "../models";

/**
 * Case-insensitive search that checks if any field contains the search text
 */
function searchInFields(searchText: string, ...fields: (string | undefined)[]): boolean {
  if (!searchText) return true;
  const lower = searchText.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(lower));
}

/**
 * Check if an object matches search text by name and snippet
 */
export function objectMatchesSearch(object: SpaceObject, searchText: string): boolean {
  return searchInFields(searchText, object.name, object.snippet);
}

/**
 * Check if an item with name and optional snippet matches search text
 */
export function itemMatchesSearch(item: { name: string; snippet?: string }, searchText: string): boolean {
  return searchInFields(searchText, item.name, item.snippet);
}

/**
 * Check if a member matches search text by name and global_name
 */
export function memberMatchesSearch(member: Member, searchText: string): boolean {
  return searchInFields(searchText, member.name, member.global_name);
}

/**
 * Check if a space matches search text by name and description
 */
export function spaceMatchesSearch(space: Space, searchText: string): boolean {
  return searchInFields(searchText, space.name, space.description);
}

/**
 * Check if a tag matches search text by name
 */
export function tagMatchesSearch(tag: Tag, searchText: string): boolean {
  return searchInFields(searchText, tag.name);
}
