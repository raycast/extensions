import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  tenantId: string;
  clientId: string;
}

export const prefs = getPreferenceValues<Preferences>();
