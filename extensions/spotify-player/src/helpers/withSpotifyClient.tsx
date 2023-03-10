import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import SpotifyWebApi from "spotify-web-api-node";
import { authorize } from "../api/oauth";

export let spotifyClient: SpotifyWebApi | null = null;

export function withSpotifyClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const accessToken = await authorize();

      spotifyClient = new SpotifyWebApi();
      spotifyClient.setAccessToken(accessToken);

      forceRerender(x + 1);
    })();
  }, []);

  if (!spotifyClient) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withSpotifyClient` is only supported in `view` and `menu-bar` mode");
      return null;
    }
  }

  return component;
}

export function getSpotifyClient(): { spotifyClient: SpotifyWebApi } {
  if (!spotifyClient) {
    throw new Error("getSpotifyClient must be used when authenticated");
  }

  return {
    spotifyClient,
  };
}

export async function setSpotifyClient() {
  const accessToken = await authorize();

  spotifyClient = new SpotifyWebApi();
  spotifyClient.setAccessToken(accessToken);
}
