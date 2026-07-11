import { getPreferenceValues } from "@raycast/api";

export const getPreferences = () => getPreferenceValues<Preferences>();
