import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

type Input = {
  /**
   * The entity data name to fetch structure for
   * This is the entity_data_name property from the entity object
   */
  entityDataName: string;
};

/**
 * Tool to get the structure of a specific entity including field types.
 *
 * @param input.entityDataName The entity_data_name from get-entities
 * @returns Raw API response with entity structure data
 */
export default async function tool(input: Input) {
  const { entityDataName } = input;
  const preferences = getPreferenceValues<Preferences>();

  if (!entityDataName) {
    throw new Error("Entity data name is required");
  }

  const url = `https://${preferences.organization}.origami.ms/entities/api/entity_structure/format/json`;
  const data = {
    username: preferences.email,
    api_secret: preferences["api-token"],
    entity_data_name: entityDataName,
  };

  const response = await makeRequest(url, data);

  return response;
}
