import { search } from "../api";
import { SortDirection, SortProperty } from "../models";
import { apiLimit } from "../utils";

type Input = {
  /**
   * The unique identifier of the space to search within.
   * This value can be obtained from the `getSpaces` tool.
   */
  spaceId: string;

  /**
   * The search query for the title of the page.
   * Note: Only plain text is supported; operators are not allowed.
   */
  query: string;

  /**
   * The types of objects to search for, identified by their type_key or id.
   * This value can be obtained from the `getTypes` tool and must be called if users request to search for objects of a certain type.
   * When user asks for 'list' objects, search for 'ot-set' and 'ot-collection' types.
   * If no types are specified, the search will include all types of objects.
   */
  types?: string[];

  /**
   * Optional sorting options for the search results
   * (e.g., sorting direction and field).
   */
  sort?: {
    /**
     * The sorting direction for the search results.
     * This value can be either "asc" (ascending) or "desc" (descending).
     * Default value is "desc".
     */
    direction?: SortDirection;

    /**
     * The sorting field for the search results.
     * This value can be "last_modified_date", "last_opened_date", "created_date" or "name".
     * Default value is "last_modified_date".
     */
    property?: SortProperty;
  };
};

/**
 * Perform a search for objects within a specific space.
 * This function queries the specified space and returns a list of objects
 * that match the search criteria.
 * For empty search query and sort criterion, most recently modified objects are returned.
 */
export default async function tool({ spaceId, query, types, sort }: Input) {
  types = types ?? [];
  const sortOptions = {
    property: sort?.property ?? SortProperty.LastModifiedDate,
    direction: sort?.direction ?? SortDirection.Descending,
  };

  const { data, pagination } = await search(
    spaceId,
    { query, types, sort: sortOptions },
    { offset: 0, limit: apiLimit },
  );
  const results = data.map(({ object, name, id, type, snippet }) => ({
    object,
    name,
    id,
    type: {
      name: type.name,
      id: type.id,
      type_key: type.key,
    },
    snippet,
  }));

  return {
    results,
    pagination,
  };
}
