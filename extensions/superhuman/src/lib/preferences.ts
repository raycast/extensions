import { getPreferenceValues } from "@raycast/api";

export interface SuperhumanPreferences {
  enableDraftPreviews: boolean;
  readOnlyMode: boolean;
}

export function getPreferences(): SuperhumanPreferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    enableDraftPreviews: Boolean(raw.enableDraftPreviews),
    readOnlyMode: Boolean(raw.readOnlyMode),
  };
}
