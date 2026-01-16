export interface MixpanelUserResult {
  $distinct_id: string;
  $properties: {
    $name: string;
    $email?: string;
    $ae_first_app_open_date?: string;
    $android_app_version?: string;
    $ios_app_release?: string;
    $last_seen?: string;
  };
}

export default interface MixpanelUser {
  id: string;
  name: string;
  email: string;
  first_app_open: string;
  android_app_version: string;
  ios_app_version: string;
  last_seen: string;
}

/**
 * Parses a user starting by the data returned by Mixpanel API
 * @param data the json containing all the data relating to an user
 * @returns The user
 */
export function parseUser(data: MixpanelUserResult): MixpanelUser {
  const props = data["$properties"];
  return {
    id: data["$distinct_id"],
    name: props["$name"],
    email: props["$email"] ?? "N/A",
    first_app_open: props["$ae_first_app_open_date"] ?? "N/A",
    android_app_version: props["$android_app_version"] ?? "N/A",
    ios_app_version: props["$ios_app_release"] ?? "N/A",
    last_seen: props["$last_seen"] ?? "N/A",
  };
}
