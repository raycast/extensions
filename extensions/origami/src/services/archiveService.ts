import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

/**
 * Archives or unarchives an instance
 * @param entityDataName The entity data name
 * @param instanceId The instance ID to archive/unarchive
 * @param archive Whether to archive (true) or unarchive (false)
 */
export async function toggleInstanceArchive(
  entityDataName: string,
  instanceId: string,
  archive: boolean,
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = `https://${preferences.organization}.origami.ms/entities/api/archive_action`;
    const requestData = {
      username: preferences.email,
      api_secret: preferences["api-token"],
      entity_data_name: entityDataName,
      id: instanceId,
      type: archive ? "in" : "out",
    };

    return await makeRequest(url, requestData);
  } catch (error) {
    console.error("Error toggling instance archive:", error);
    throw error;
  }
}
