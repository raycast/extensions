import { useEffect } from "react";
import { checkSpotifyApp } from "../helpers/isSpotifyInstalled";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

/**
 * Makes sure that we have a authenticated Spotify client available in the children
 */
export function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkSpotifyApp();
  }, []);

  return withSpotifyClient(children);
}
