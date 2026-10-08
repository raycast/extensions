import format from "./format";
import { getPreferenceValues } from "@raycast/api";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  return format("JSON", preferences.jsonParser);
};
