import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchOwnedGames, getOwnedGames } from "../api/steam";

/** Returns minutes played if owned, -1 if not owned, null if still loading */
export function usePlaytime(appId: number): number | null {
  const { steamApiKey, steamId } = getPreferenceValues<{
    steamApiKey: string;
    steamId: string;
  }>();

  const [playtime, setPlaytime] = useState<number | null>(() => {
    const current = getOwnedGames();
    if (current === null) return null;
    return current.has(appId) ? (current.get(appId) ?? 0) : -1;
  });

  useEffect(() => {
    const current = getOwnedGames();
    if (current !== null) {
      setPlaytime(current.has(appId) ? (current.get(appId) ?? 0) : -1);
      return;
    }
    fetchOwnedGames(steamApiKey, steamId).then((map) => {
      setPlaytime(map.has(appId) ? (map.get(appId) ?? 0) : -1);
    });
  }, [appId, steamApiKey, steamId]);

  return playtime;
}
