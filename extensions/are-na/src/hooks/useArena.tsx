import { getPreferenceValues } from "@raycast/api";
import { Arena } from "../api/arena";
import { useMemo } from "react";

export interface Preferences {
  accessToken: string;
}

export function useArena() {
  const preferences = getPreferenceValues<Preferences>();
  const accessToken = preferences.accessToken;

  return useMemo(() => {
    return new Arena({
      accessToken,
    });
  }, [accessToken]);
}

export function getConfiguration(): Preferences {
  return getPreferenceValues<Preferences>();
}
