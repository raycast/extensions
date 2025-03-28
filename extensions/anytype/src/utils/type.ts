import { getTemplates, getTypes } from "../api";
import { Space, Template, Type } from "../models";
import { apiLimitMax } from "../utils";

/**
 * Checks if a given `Type` is a list type.
 */
export function typeIsList(layout: string): boolean {
  return layout === "set" || layout === "collection";
}

/**
 * Fetches all `Type`s from a single space, doing pagination if necessary.
 */
export async function fetchAllTypesForSpace(spaceId: string): Promise<Type[]> {
  const allTypes: Type[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await getTypes(spaceId, { offset, limit: apiLimitMax });
    allTypes.push(...response.types);
    hasMore = response.pagination.has_more;
    offset += apiLimitMax;
  }

  return allTypes;
}

/**
 * Aggregates all `Type`s from all given spaces.
 */
export async function getAllTypesFromSpaces(spaces: Space[]): Promise<Type[]> {
  const allTypes: Type[] = [];
  for (const space of spaces) {
    try {
      const types = await fetchAllTypesForSpace(space.id);
      allTypes.push(...types);
    } catch (err) {
      console.log(`Error fetching types for space ${space.id}:`, err);
    }
  }
  return allTypes;
}

/**
 * Fetches all `Template`s from a single space and type, doing pagination if necessary.
 */
export async function fetchAllTemplatesForSpace(spaceId: string, typeId: string): Promise<Template[]> {
  const allTemplates: Template[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await getTemplates(spaceId, typeId, { offset, limit: apiLimitMax });
    allTemplates.push(...response.templates);
    hasMore = response.pagination.has_more;
    offset += apiLimitMax;
  }

  return allTemplates;
}

/**
 * Fetches all unique type keys for page types.
 */
export async function fetchTypeKeysForPages(
  spaces: Space[],
  uniqueKeysForTasks: string[],
  uniqueKeysForLists: string[],
): Promise<string[]> {
  const excludedKeysForPages = new Set([
    // not shown anywhere
    "ot-audio",
    "ot-chat",
    "ot-file",
    "ot-image",
    "ot-objectType",
    "ot-tag",
    "ot-template",
    "ot-video",

    // shown in other views
    "ot-set",
    "ot-collection",
    "ot-bookmark",
    "ot-participant",
    ...uniqueKeysForTasks,
    ...uniqueKeysForLists,
  ]);

  const allTypes = await getAllTypesFromSpaces(spaces);
  const uniqueKeysSet = new Set(allTypes.map((type) => type.key).filter((key) => !excludedKeysForPages.has(key)));
  return Array.from(uniqueKeysSet);
}

/**
 * Fetches all unique type keys for task types.
 */
export async function fetchTypesKeysForTasks(spaces: Space[]): Promise<string[]> {
  const tasksTypes = await getAllTypesFromSpaces(spaces);
  const uniqueKeys = new Set(tasksTypes.filter((type) => type.recommended_layout === "todo").map((type) => type.key));
  return Array.from(uniqueKeys);
}

/**
 * Fetches all unique type keys for list types.
 */
export async function fetchTypeKeysForLists(spaces: Space[]): Promise<string[]> {
  const listsTypes = await getAllTypesFromSpaces(spaces);
  const typeKeys = new Set(
    listsTypes
      .filter((type) => type.recommended_layout === "set" || type.recommended_layout === "collection")
      .map((type) => type.key),
  );
  return Array.from(typeKeys);
}
