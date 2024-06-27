import { Station } from "./types";

const FAVORITE_STATION_KEY = "favorite-stations";

export function addStationToFavorite(s: Station) {
  const val = localStorage.getItem(FAVORITE_STATION_KEY);

  if (val !== null) {
    JSON.parse(val);
  }
}
