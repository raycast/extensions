import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";
import { makeRequest } from "../utils/api";

/**
 * Interface for user data as returned by the API
 */
export interface UserData {
  instance_id: string;
  text: string;
}

/**
 * Interface for user details in API response
 */
interface UserResponse {
  instance_data: {
    _id: string;
    field_groups: Array<{
      field_group_data: {
        group_data_name: string;
      };
      fields_data: Array<
        Array<{
          field_data_name: string;
          value?: string | number | unknown;
        }>
      >;
    }>;
  };
}

/**
 * Interface for field data structure used in the create instance API request
 */
export interface FieldData {
  [key: string]: string | number | UserData | UserData[] | string[] | { timestamp: number; text: string } | undefined;
}

/**
 * Interface for form data structure used in the create instance API request
 */
export interface FormData {
  group_data_name: string;
  data: FieldData[];
}

/**
 * Interface for the user API response
 */
interface UserApiResponse {
  data: UserResponse[];
}

/**
 * Interface for the create instance API response
 */
interface CreateInstanceApiResponse {
  status?: string;
  message?: string;
  instance_id?: string;
  // Alternative success response format
  success?: string;
  results?: {
    _id: string;
  };
}

/**
 * Fetches all available users from the Origami system
 * @returns An array of user objects containing id and name
 */
export async function getUsers(): Promise<UserData[]> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = `https://${preferences.organization}.origami.ms/entities/api/instance_data_protected/format/json`;
    const requestData = {
      username: preferences.email,
      api_secret: preferences["api-token"],
      entity_data_name: "origami_users",
    };

    const response = await makeRequest<UserApiResponse>(url, requestData);

    if (!response || !response.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((user) => {
      const firstName = getUserFieldValue(user, "origami_user_first_name");
      const lastName = getUserFieldValue(user, "origami_user_last_name");

      return {
        instance_id: user.instance_data._id,
        text: `${firstName} ${lastName}`.trim(),
      };
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/**
 * Helper function to extract field value from user object
 */
function getUserFieldValue(user: UserResponse, fieldDataName: string): string {
  if (!user?.instance_data?.field_groups) return "";

  for (const group of user.instance_data.field_groups) {
    if (!group?.fields_data || !Array.isArray(group.fields_data)) continue;

    for (const fields of group.fields_data) {
      if (!Array.isArray(fields)) continue;

      const field = fields.find((f) => f.field_data_name === fieldDataName);
      if (field && field.value) return String(field.value);
    }
  }

  return "";
}

/**
 * Creates a new instance in the specified entity
 * @param entityDataName The entity data name to create the instance in
 * @param formData The form data for the new instance
 * @returns The API response for the create instance request
 */
export async function createInstance(entityDataName: string, formData: FormData[]): Promise<CreateInstanceApiResponse> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = `https://${preferences.organization}.origami.ms/entities/api/create_instance/format/json`;
    const requestData = {
      username: preferences.email,
      api_secret: preferences["api-token"],
      entity_data_name: entityDataName,
      form_data: formData,
    };

    return await makeRequest<CreateInstanceApiResponse>(url, requestData);
  } catch (error) {
    console.error("Error creating instance:", error);
    throw error;
  }
}
