import { getPreferenceValues } from "@raycast/api";
import MixpanelUser, { MixpanelUserResult, parseUser } from "../model/user";
import { API_HEADERS, BASE_URL } from "../model/api";
import ErrorResult from "../model/error";

export default async function findUsers(data: string): Promise<MixpanelUser[]> {
  const { project_id } = getPreferenceValues<Preferences.Index>();
  const options = {
    method: "POST",
    headers: API_HEADERS,
    body: new URLSearchParams({
      output_properties:
        '["$distinct_id", "$name", "$email", "$ae_first_app_open_date","$android_app_version", "$ios_app_release","$last_seen"]',
      where: `"${data}" in properties["$email"] or "${data}" in properties["$name"]`,
    }),
  };

  const response = await fetch(`${BASE_URL}/api/2.0/engage?project_id=${project_id}`, options);
  const result: ErrorResult | { results: MixpanelUserResult[] } = await response.json();
  if ("error" in result) throw new Error(result.error);
  return result.results.map(parseUser);
}
