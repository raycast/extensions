import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  rememberTag: boolean;
  hideWidgets: boolean;
}
export const { rememberTag, hideWidgets } = getPreferenceValues<Preferences>();
