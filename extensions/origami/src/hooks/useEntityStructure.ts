import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

interface EntityStructureResponse {
  entity_data: {
    entity_name: string;
    entity_data_name: string;
  };
  instance_data: Array<{
    field_group_data: {
      group_name: string;
      group_data_name: string;
      repeatable_group: string;
    };
    fields_data: Array<{
      required: number | string;
      field_name: string;
      field_type_name: string;
      field_data_name: string;
      tooltip_description: string;
      placeholder: string | null;
      default_value: string | null;
      possible_values?: string;
      custom_validation: {
        start_from?: string;
        to_end?: string;
        interval?: string;
        unable_to_edit: string;
      };
    }>;
  }>;
}

/**
 * Hook for fetching entity structure details
 *
 * @param entityDataName The entity data name to fetch structure for
 * @returns The entity structure data, loading state, and error
 */
export function useEntityStructure(entityDataName: string) {
  const preferences = getPreferenceValues<Preferences>();

  return useCachedPromise(
    async (entityName: string) => {
      if (!entityName) return null;

      const url = `https://${preferences.organization}.origami.ms/entities/api/entity_structure/format/json`;
      const requestData = {
        username: preferences.email,
        api_secret: preferences["api-token"],
        entity_data_name: entityName,
        type: 2,
      };

      try {
        const response = await makeRequest<EntityStructureResponse>(url, requestData);
        return response;
      } catch (error) {
        console.error("Error fetching entity structure:", error);
        throw error;
      }
    },
    [entityDataName],
    {
      execute: !!entityDataName,
    },
  );
}
