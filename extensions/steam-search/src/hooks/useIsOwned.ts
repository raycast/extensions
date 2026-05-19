import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchOwnedGames, getOwnedAppIds } from "../api/steam";

export function useIsOwned(appId: number): boolean | null {
  const { steamApiKey, steamId } = getPreferenceValues();
  const [owned, setOwned] = useState<boolean | null>(
    getOwnedAppIds() !== null ? getOwnedAppIds()!.has(appId) : null,
  );

  useEffect(() => {
    const current = getOwnedAppIds();
    if (current !== null) {
      setOwned(current.has(appId));
      return;
    }
    fetchOwnedGames(steamApiKey, steamId).then((ids) =>
      setOwned(ids.has(appId)),
    );
  }, [appId]);

  return owned;
}
