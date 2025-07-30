import { useEffect } from "react";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

/**
 * Makes sure that we have a authenticated Spotify client available in the children
 */
export const View = withSpotifyClient(({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    checkSpotifyApp();
  }, []);

  return children;
});
