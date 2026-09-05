import { getPreferenceValues } from "@raycast/api";

export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
