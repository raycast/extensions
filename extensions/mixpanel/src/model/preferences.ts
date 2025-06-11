import { getPreferenceValues } from "@raycast/api";
import { API_HEADERS, BASE_URL } from "./api";

export async function arePreferencesValid() {
  const { project_id } = getPreferenceValues<Preferences.Index>();
  try {
    const options = {
    method: "POST",
    headers: API_HEADERS,
    body: new URLSearchParams({
      output_properties:
        '["$distinct_id", "$email"]'
    })}
    const response = await fetch(`${BASE_URL}/api/2.0/engage?project_id=${project_id}&limit=1`, options);
    if (!response.ok) throw new Error();
    return true;
  } catch {
    return false;
  }
}
