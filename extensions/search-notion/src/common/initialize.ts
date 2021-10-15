import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  cookie: string;
  spaceID: string;
}

export async function initialize(): Promise<{
  cookie: string;
  spaceID: string;
}> {
  const preferences: Preferences = getPreferenceValues();
  return preferences;
}
