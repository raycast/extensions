import { getPreferenceValues } from "@raycast/api";
import { Arena } from "../api/arena";
import { useMemo } from "react";

export function useArena() {
  const { accessToken } = getPreferenceValues<Preferences>();

  return useMemo(() => {
    return new Arena({
      accessToken,
    });
  }, [accessToken]);
}
