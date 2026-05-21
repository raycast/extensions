import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchWishlist, getWishlist } from "../api/steam";

/** Returns true if wishlisted, false if not, null if still loading */
export function useIsWishlisted(appId: number): boolean | null {
  const { steamApiKey, steamId } = getPreferenceValues();

  const [wishlisted, setWishlisted] = useState<boolean | null>(() => {
    const current = getWishlist();
    if (current === null) return null;
    return current.has(appId);
  });

  useEffect(() => {
    const current = getWishlist();
    if (current !== null) {
      setWishlisted(current.has(appId));
      return;
    }
    fetchWishlist(steamApiKey as string, steamId as string).then((ids) => {
      setWishlisted(ids.has(appId));
    });
  }, [appId, steamApiKey, steamId]);

  return wishlisted;
}
