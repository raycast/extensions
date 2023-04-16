import { getPreferenceValues } from "@raycast/api";

export const preferences: Preferences = getPreferenceValues();

export interface Preferences {
  putioClientId: string;
  putioOAuthToken: string;
  actionTitle1?: string;
  actionCommand1?: string;
  actionTitle2?: string;
  actionCommand2?: string;
}
