import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

/**
 * Deletes an instance
 * @param entityDataName The entity data name
 * @param instanceId The instance ID to delete
 */
export async function deleteInstance(entityDataName: string, instanceId: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = `https://${preferences.organization}.origami.ms/entities/api/remove_instance/format/json`;
    const requestData = {
      username: preferences.email,
      api_secret: preferences["api-token"],
      entity_data_name: entityDataName,
      _ids: [instanceId],
    };

    return await makeRequest(url, requestData);
  } catch (error) {
    console.error("Error deleting instance:", error);
    throw error;
  }
}
