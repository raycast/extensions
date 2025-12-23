import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export const APIKEY = preferences.apiKey;
const NASA_BASEURL = "https://api.nasa.gov";
const SPACEDEVS_BASEURL = "https://ll.thespacedevs.com/2.2.0";

export const ENDPOINTS = {
  APOD: `${NASA_BASEURL}/planetary/apod?api_key=APIKEY`,
  RSS: "https://www.nasa.gov/news-release/feed/",
  ASTRONAUTS: `${SPACEDEVS_BASEURL}/astronaut/?in_space=true&limit=100`,
  SPACECRAFTS: `${SPACEDEVS_BASEURL}/spacecraft/?in_space=true&limit=100`,
  LAUNCHES: `${SPACEDEVS_BASEURL}/launch/upcoming/?limit=100`,
};

export const HEADERS = {
  accept: "application/json",
};
