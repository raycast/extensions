import format from "./format";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  return format("TypeScript", preferences.tsParser);
};
