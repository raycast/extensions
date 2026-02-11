import { getPreferenceValues } from "@raycast/api";
import { API } from "../constants/constants";
import { SearchArtistsResponse } from "../types/SearchArtistsResponse";
import { showFailureToast } from "@raycast/utils";

type Input = {
  /**
   * Artist name to search for
   */
  artistName: string;
};

export default async function searchArtist(input: Input) {
  const preferences = getPreferenceValues<{ apiKey: string }>();
  const url = `${API.BASE_URL}${API.ARTIST_SEARCH}?artistName=${encodeURIComponent(input.artistName)}&p=1&sort=relevance`;
  const requestOptions = {
    headers: {
      "x-api-key": preferences.apiKey,
      Accept: "application/json",
    },
  };
  let response = await fetch(url, requestOptions);
  if (response.status == 429) {
    // Rate limit exceeded (wait 3 second and retry)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    response = await fetch(url, requestOptions);
  }
  if (response.status == 404) {
    showFailureToast("No artists found");
    return null;
  }
  const json = (await response.json()) as SearchArtistsResponse;
  const artist = json.artist;
  return artist;
}
