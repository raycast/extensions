import { getPreferenceValues } from "@raycast/api";
import { Entity, Preferences } from "../types";
import { makeRequest } from "../utils/api";

/**
 * Tool to get a list of all available entities in the Origami workspace.
 *
 * @returns A list of entities with their names and data names
 */
export default async function tool() {
  const preferences = getPreferenceValues<Preferences>();

  const url = `https://${preferences.organization}.origami.ms/entities/api/entities_list/format/json`;
  const data = {
    username: preferences.email,
    api_secret: preferences["api-token"],
  };

  const response = await makeRequest<Record<string, unknown>>(url, data);

  if ("error" in response) {
    return response;
  }

  const entities = response as unknown as Entity[];

  const nonProtectedEntities = entities
    .filter((entity) => entity.protected_entity === "0")
    .map((entity) => ({
      id: entity.entity_id,
      name: entity.entity_name,
      dataName: entity.entity_data_name,
    }));

  return {
    entities: nonProtectedEntities,
    count: nonProtectedEntities.length,
  };
}
