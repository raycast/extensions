import { getTemplates, getTypes } from "../api";
import { ObjectLayout, Space, SpaceObject, Type } from "../models";
import { apiLimitMax, bundledTypeKeys } from "../utils";

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
export async function fetchAllTemplatesForSpace(spaceId: string, typeId: string): Promise<SpaceObject[]> {
  const allTemplates: SpaceObject[] = [];
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
  typeKeysForTasks: string[],
  typeKeysForLists: string[],
): Promise<string[]> {
  const excludedKeysForPages = new Set([
    // not shown anywhere
    bundledTypeKeys.audio,
    bundledTypeKeys.chat,
    bundledTypeKeys.file,
    bundledTypeKeys.image,
    bundledTypeKeys.object_type,
    bundledTypeKeys.tag,
    bundledTypeKeys.template,
    bundledTypeKeys.video,

    // shown in other views
    bundledTypeKeys.set,
    bundledTypeKeys.collection,
    bundledTypeKeys.bookmark,
    bundledTypeKeys.participant,
    ...typeKeysForTasks,
    ...typeKeysForLists,
  ]);

  const allTypes = await getAllTypesFromSpaces(spaces);
  const pageTypeKeys = new Set(allTypes.map((type) => type.key).filter((key) => !excludedKeysForPages.has(key)));
  return Array.from(pageTypeKeys);
}

/**
 * Fetches all type keys for task types.
 */
export async function fetchTypesKeysForTasks(spaces: Space[]): Promise<string[]> {
  const tasksTypes = await getAllTypesFromSpaces(spaces);
  const taskTypeKeys = new Set(
    tasksTypes.filter((type) => type.layout === ObjectLayout.Action).map((type) => type.key),
  );
  return Array.from(taskTypeKeys);
}

/**
 * Fetches all type keys for list types.
 */
export async function fetchTypeKeysForLists(spaces: Space[]): Promise<string[]> {
  const listsTypes = await getAllTypesFromSpaces(spaces);
  const listTypeKeys = new Set(
    listsTypes
      .filter((type) => type.layout === ObjectLayout.Set || type.layout === ObjectLayout.Collection)
      .map((type) => type.key),
  );
  return Array.from(listTypeKeys);
}
