import { getPreferenceValues, LocalStorage } from "@raycast/api";
import type { Favorite, Preferences } from "./types";

const appendApiKey = (baseUrl: string) => {
  const preferences = getPreferenceValues<Preferences>();
  const url = new URL(baseUrl);
  const params = new URLSearchParams(url.search);

  if (preferences.apiKey !== undefined && preferences.apiKey !== "") {
    params.append("api_key", preferences.apiKey);
  }

  return `${url.origin}${url.pathname}?${params.toString()}`;
};
export { appendApiKey };

export class FavoriteService {
  static async favorites(): Promise<Favorite[]> {
    const favorites: string | undefined = await LocalStorage.getItem("favorite-stops");
    if (favorites) {
      return JSON.parse(favorites) as Favorite[];
    } else {
      return [];
    }
  }
}
