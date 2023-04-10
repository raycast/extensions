import fetch from "node-fetch";
import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import type {
  BasicTitle,
  EnrichedTitle,
  SearchAPIResponse,
  TitleAPIResponse,
} from "../types";

const preferences: { token: string } = getPreferenceValues();
const apiKey = preferences.token;

export const getSearchResults = async (
  search: string
): Promise<BasicTitle[] | null> => {
  try {
    const response = await fetch(
      `https://www.omdbapi.com/?s=${search}&apikey=${apiKey}`
    );

    if (response.status === 200) {
      const json = (await response.json()) as SearchAPIResponse;

      if (json.Response === "True" && json.Search) {
        // success
        return json.Search.filter(
          (title) => title.imdbID?.includes("tt") && title.Type !== "game"
        );
      }
    } else {
      // api returned failure
      showToast(
        ToastStyle.Failure,
        `Status: ${response.status} [${response.statusText}]`
      );
    }

    // toast has shown, resolve promise
    return Promise.resolve(null);
  } catch (error) {
    showToast(ToastStyle.Failure, "Could not load results");
    return Promise.resolve(null);
  }
};

export const getEnrichedTitle = async (
  id: string
): Promise<EnrichedTitle | null> => {
  try {
    const response = await fetch(
      `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`
    );

    if (response.status === 200) {
      const json = (await response.json()) as TitleAPIResponse;

      if (
        json.Response === "True" &&
        json.Plot !== "N/A" &&
        json.Rated !== "N/A"
      ) {
        return json as EnrichedTitle;
      }
    } else {
      showToast(
        ToastStyle.Failure,
        `Status: ${response.status} [${response.statusText}]`
      );
    }
    return Promise.resolve(null);
  } catch (error) {
    showToast(ToastStyle.Failure, "Could not load results");
    return Promise.resolve(null);
  }
};
