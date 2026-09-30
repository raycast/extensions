import { getPreferenceValues } from "@raycast/api";
import { EntityDataResponse, Preferences } from "../types";
import { makeRequest } from "../utils/api";
import { createFilter } from "../utils/entities";
import { getFilterOperator } from "../utils/filters";

type Input = {
  /**
   * The entity data name to fetch instances for
   * This is the entity_data_name property from the entity object
   */
  entityDataName: string;

  /**
   * Field data name to filter by
   * This is the field_data_name property from the entity structure
   * For time-based queries (e.g. "from last week", "added today"):
   * - Always use timestamp/date fields
   * For other queries:
   * - Use fields matching the query's meaning (name, email, etc.)
   */
  fieldDataName: string;

  /**
   * Field type name
   * This is the field_type_name property from the entity structure
   * Used to determine the correct filter operator
   */
  fieldTypeName: string;

  /**
   * Filter value to use
   * For specific filtering, provide the value to match, or use an empty string to get all instances.
   * When using the "=" operator, special values are supported for timestamp-based filtering:
   * - "1": Matches instances from today
   * - "2": Matches instances from yesterday
   * - "3": Matches instances from the current week
   * - "4": Matches instances from the last 7 days
   * - "5": Matches instances from the last 30 days
   * - "6": Matches instances from the current month
   * - "7": Matches instances from the last month
   * - "8": Matches instances from the current year
   * - "9": Matches instances from tomorrow
   */
  filterValue: string;

  /**
   * Whether to include archived instances
   * Default is false
   */
  includeArchived?: boolean;
};

/**
 * Tool to get instances of a specific entity with field-specific filtering.
 *
 * @param input.entityDataName The entity_data_name from get-entities
 * @param input.fieldDataName The field_data_name from get-entity-structure
 * @param input.fieldTypeName The field_type_name from get-entity-structure
 * @param input.filterValue The value to filter by (use EMPTY STRING "" to get all instances)
 * @param input.includeArchived Whether to include archived instances (optional)
 * @returns The raw API response with instance data
 */
export default async function tool(input: Input) {
  const { entityDataName, fieldDataName, fieldTypeName, filterValue, includeArchived = false } = input;

  const preferences = getPreferenceValues<Preferences>();

  const url = `https://${preferences.organization}.origami.ms/entities/api/instance_data/format/json`;

  // Determine the appropriate filter operator based on field type
  const filterOperator = getFilterOperator(fieldTypeName);

  // Create filter based on field type, operator, and value
  const filter = createFilter(fieldDataName, fieldTypeName, filterOperator, filterValue);

  const data = {
    username: preferences.email,
    api_secret: preferences["api-token"],
    entity_data_name: entityDataName,
    max_each_page: 500,
    page_number: 0,
    include_archived: includeArchived ? 1 : 0,
    filter: filter,
  };

  const response: EntityDataResponse = await makeRequest(url, data);

  return {
    ...response,
    filterOperator: filterOperator,
  };
}
