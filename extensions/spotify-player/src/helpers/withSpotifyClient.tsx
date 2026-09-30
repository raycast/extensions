import { provider } from "../api/oauth";
import * as api from "../helpers/spotify.api";
import nodeFetch from "node-fetch";
import { withAccessToken } from "@raycast/utils";
import { withRateLimitRetry } from "./rateLimitRetry";

export let spotifyClient: typeof api | undefined;

provider.onAuthorize = ({ token }) => {
  // Send this header with each request
  api.defaults.headers = {
    Authorization: `Bearer ${token}`,
  };

  // Use this instead of the global fetch, with rate limit retry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.fetch = withRateLimitRetry(nodeFetch as any) as any;

  spotifyClient = api;
};

export const withSpotifyClient = withAccessToken(provider);

export function getSpotifyClient() {
  if (!spotifyClient) {
    throw new Error("getSpotifyClient must be used when authenticated");
  }

  return {
    spotifyClient,
  };
}

export async function setSpotifyClient() {
  const accessToken = await provider.authorize();

  // Send this header with each request
  api.defaults.headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Use this instead of the global fetch, with rate limit retry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.fetch = withRateLimitRetry(nodeFetch as any) as any;

  spotifyClient = api;
}
