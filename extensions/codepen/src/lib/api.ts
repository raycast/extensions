import { getPreferenceValues } from "@raycast/api";
import { CodePenClient } from "./client";

export function getClient() {
  return new CodePenClient(getPreferenceValues<Preferences>().apiKey);
}
