import { getPreferenceValues } from "@raycast/api";
import MixpanelUser, { parseUser } from "../model/user";
import { API_HEADERS, BASE_URL } from "../model/api";

export default async function findUsers(data: string): Promise<MixpanelUser[]> {
  const { project_id } = getPreferenceValues<Preferences.Index>();
  const options = {
    method: "POST",
    headers: API_HEADERS,
    body: new URLSearchParams({
      output_properties:
        '["$distinct_id", "name", "$email", "$ae_first_app_open_date","$android_app_version", "$ios_app_release","$last_seen"]',
      where: `"${data}" in properties["$email"] or "${data}" in properties["$name"]`,
    }),
  };

  try {
  const result = await fetch(`${BASE_URL}/api/2.0/engage?project_id=${project_id}`, options)
    .then((response) => response.json());

    return (result as { results: any[] }).results?.map(parseUser) ?? [];
  } catch (err) {
    console.error(`Failed to parse users: ${err}`);
    return [];
  }
}
