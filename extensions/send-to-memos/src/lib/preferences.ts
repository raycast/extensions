import { getPreferenceValues } from "@raycast/api";
import { ApiVersion, Visibility } from "./memos";

export interface ExtensionPreferences {
  serverUrl: string;
  accessToken: string;
  defaultTags?: string;
  defaultVisibility: Visibility;
  openAfterSend: boolean;
  apiVersion: ApiVersion;
}

export function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}
