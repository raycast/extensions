import { useMemo, useState } from "react";
import { Detail, environment, MenuBarExtra } from "@raycast/api";
import { authorize } from "../api/oauth";
import * as api from "../helpers/spotify.api";
import nodeFetch from "node-fetch";

export let spotifyClient: typeof api | undefined;

export function withSpotifyClient(component: JSX.Element) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      const accessToken = await authorize();

      // Send this header with each request
      api.defaults.headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      // Use this instead of the global fetch
      api.defaults.fetch = nodeFetch as any;

      spotifyClient = api;

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

export function getSpotifyClient() {
  if (!spotifyClient) {
    throw new Error("getSpotifyClient must be used when authenticated");
  }

  return {
    spotifyClient,
  };
}

export async function setSpotifyClient() {
  const accessToken = await authorize();

  // Send this header with each request
  api.defaults.headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Use this instead of the global fetch
  api.defaults.fetch = nodeFetch as any;

  spotifyClient = api;
}
