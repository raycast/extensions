import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

/**
 * Interface for the edit instance API response
 */
interface EditInstanceApiResponse {
  status?: string;
  message?: string;
  success?: string;
}

/**
 * Type definition for a field value pair
 */
export type FieldValuePair = [string, string | number | boolean | null];

/**
 * Updates an instance's fields
 * @param entityDataName The entity data name
 * @param instanceId The instance ID to update
 * @param fields Array of field-value pairs to update
 * @returns The API response for the update fields request
 */
export async function editInstanceFields(
  entityDataName: string,
  instanceId: string,
  fields: FieldValuePair[],
): Promise<EditInstanceApiResponse> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = `https://${preferences.organization}.origami.ms/entities/api/update_instance_fields/format/json`;
    const requestData = {
      username: preferences.email,
      api_secret: preferences["api-token"],
      entity_data_name: entityDataName,
      filter: [["_id", "=", instanceId]],
      field: fields,
    };

    return await makeRequest<EditInstanceApiResponse>(url, requestData);
  } catch (error) {
    console.error("Error editing instance:", error);
    throw error;
  }
}
