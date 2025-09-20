import { getPreferenceValues } from "@raycast/api";
import { API } from "../constants/constants";
import { showFailureToast } from "@raycast/utils";
import { SearchSetlistResponse } from "../types/SearchSetlistResponse";

type Input = {
  /**
   * Artist MBID to search for
   */
  artistMbid?: string;
  /**
   * Year of the setlist
   */
  year?: string;
  /**
   * City of the setlist
   */
  cityName?: string;
  /**
   * Tourname of the setlist
   */
  tourName?: string;
  /**
   * Name of the venue of the setlist
   */
  venueName?: string;
};

export default async function searchSetlists(input: Input) {
  const preferences = getPreferenceValues<{ apiKey: string }>();
  let url = `${API.BASE_URL}${API.SETLIST_SEARCH}`;
  //create a key value pair for each of the input parameters
  const params: { [key: string]: string } = {};
  if (input.artistMbid !== undefined) {
    params.artistMbid = input.artistMbid;
  }
  if (input.year !== undefined) {
    params.year = input.year;
  }
  if (input.cityName !== undefined) {
    params.cityName = input.cityName;
  }
  if (input.tourName !== undefined) {
    params.tourName = input.tourName;
  }
  if (input.venueName !== undefined) {
    params.venueName = input.venueName;
  }
  //create a query string from the params object
  const queryString = new URLSearchParams(params).toString();
  //append the query string to the url
  url += `?${queryString}`;
  //append the page number to the url
  url += `&p=1`;

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
    showFailureToast("No setlists found");
    return null;
  }
  const json = (await response.json()) as SearchSetlistResponse;
  const setlists = json.setlist.filter((setlist) => {
    return setlist.sets.set.length > 0;
  });
  return setlists;
}
