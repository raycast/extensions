import { getPreferenceValues } from "@raycast/api";
import type { DiscogsReleaseDetail, DiscogsSearchResponse } from "./types";

const SEARCH_URL = "https://api.discogs.com/database/search";
const USER_AGENT = "RaycastDiscogsSearch/1.0";

function getDiscogsHeaders() {
  const { token } = getPreferenceValues<Preferences>();
  return {
    "User-Agent": USER_AGENT,
    Authorization: `Discogs token=${token}`,
  };
}

export async function discogsSearch(
  params: Record<string, string>,
): Promise<DiscogsSearchResponse> {
  const query = new URLSearchParams({
    ...params,
    per_page: "50",
  });

  const response = await fetch(`${SEARCH_URL}?${query}`, {
    headers: getDiscogsHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status}`);
  }

  return response.json() as Promise<DiscogsSearchResponse>;
}

export async function fetchReleaseDetail(
  resourceUrl: string,
): Promise<DiscogsReleaseDetail> {
  const response = await fetch(resourceUrl, {
    headers: getDiscogsHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status}`);
  }

  return response.json() as Promise<DiscogsReleaseDetail>;
}
