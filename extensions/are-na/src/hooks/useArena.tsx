import { getPreferenceValues } from "@raycast/api";
import { Arena } from "../api/arena";

export interface Preferences {
  accessToken: string;
}

export function useArena() {
  const preferences = getPreferenceValues<Preferences>();
  const accessToken = preferences.accessToken;
  return new Arena({
    accessToken,
  });
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
