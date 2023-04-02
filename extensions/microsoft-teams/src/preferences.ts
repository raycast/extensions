import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  tenantId: string;
  clientId: string;
  apiToken: string;
}

export const prefs = getPreferenceValues<Preferences>();
