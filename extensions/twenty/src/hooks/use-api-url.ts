import { getPreferenceValues } from "@raycast/api";
const { url } = getPreferenceValues<Preferences>();
export function useApiUrl(endpoint = "") {
  try {
    return new URL(`rest/${endpoint}`, url).toString();
  } catch (error) {
    return "";
  }
}
