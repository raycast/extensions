import { getPreferenceValues } from "@raycast/api";
import { createClient } from "grist-js";

const { grist_url, api_key } = getPreferenceValues<Preferences>();
export const buildGristUrl = (path: string) => {
  try {
    const url = new URL(path, grist_url);
    return url.toString();
  } catch {
    return "";
  }
};
export const grist = createClient({
  BASE: buildGristUrl("api"),
  TOKEN: api_key,
});
