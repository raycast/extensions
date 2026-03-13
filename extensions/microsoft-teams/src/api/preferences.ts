import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  tenantId: string;
  clientId: string;
  urlTarget: "web" | "desktop";
}

export const prefs = getPreferenceValues<Preferences>();
