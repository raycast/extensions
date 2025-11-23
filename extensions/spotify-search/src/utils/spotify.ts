import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { SearchResults } from "../types";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (accessToken && now < tokenExpiry) {
    return accessToken;
  }

  const { clientId, clientSecret } = getPreferenceValues<Preferences>();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify Client ID and Client Secret must be set in preferences",
    );
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  accessToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000; // Refresh 60 seconds before expiry

  return accessToken;
}

export async function searchSpotify(
  query: string,
  limit: number = 20,
): Promise<SearchResults> {
  const token = await getAccessToken();
  const encodedQuery = encodeURIComponent(query);

  // Increase limit to get more results, then we'll sort and take top results
  const searchLimit = Math.max(limit * 2, 20);

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track,playlist,artist&limit=${searchLimit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${error}`);
  }

  const data = (await response.json()) as SearchResults;

  // Sort tracks by popularity (higher is better)
  data.tracks.items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  // Sort artists by followers (higher is better)
  data.artists.items.sort(
    (a, b) => (b.followers?.total || 0) - (a.followers?.total || 0),
  );

  // Limit results after sorting
  data.tracks.items = data.tracks.items.slice(0, limit);
  data.artists.items = data.artists.items.slice(0, limit);
  if (data.playlists.items) {
    data.playlists.items = data.playlists.items.slice(0, limit);
  }

  return data;
}
