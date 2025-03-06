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
 * Parses an user starting by the data returned by mixpanel api
 * @param data the json containing all the data relating to an user
 * @returns The user
 */
export function parseUser(data: any): MixpanelUser {
  const props = data["$properties"];
  return {
    id: data["$distinct_id"],
    name: props["name"],
    email: props["$email"],
    first_app_open: props["$ae_first_app_open_date"],
    android_app_version: props["$android_app_version"],
    ios_app_version: props["$ios_app_release"],
    last_seen: props["$last_seen"],
  };
}
