import fetch from "node-fetch";
import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import type { Preferences, Title } from "../types";

export const getTitle = async (title: string): Promise<Title | null> => {
  const preferences: Preferences = getPreferenceValues();
  const apiKey = preferences.token;

  try {
    const response = await fetch(`https://www.omdbapi.com/?t=${title}&apikey=${apiKey}`);
    if (response.status === 200) {
      // valid response
      const json = (await response.json()) as Partial<Title>;

      // filter out incomplete results
      if (json.Response === "True" && json.Plot !== "N/A" && json.imdbID?.includes("tt")) {
        return json as Title;
      } else {
        return Promise.resolve(null);
      }
    } else {
      // api returned failure
      showToast(ToastStyle.Failure, `Status: ${response.status} [${response.statusText}]`);
      return Promise.resolve(null);
    }
  } catch (error) {
    showToast(ToastStyle.Failure, "Could not load results");
    return Promise.resolve(null);
  }
};
