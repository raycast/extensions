import { getPreferenceValues, PreferenceValues } from "@raycast/api";
import axios from "axios";

import { SearchResults, TitleCountries } from "../models";

const API_URL = "unogs-unogs-v1.p.rapidapi.com";
const TITLE_SEARCH_API_URL = `https://${API_URL}/search/titles`;
const TITLE_COUNTRIES_API_URL = `https://${API_URL}/title/countries`;

const getHeaders = () => {
  const preferences: PreferenceValues = getPreferenceValues();

  return {
    "x-rapidapi-host": API_URL,
    "X-RapidAPI-Key": preferences.rapidApiKey,
  };
};

export const searchTitle = (title: string): Promise<SearchResults> =>
  axios
    .get(TITLE_SEARCH_API_URL, {
      params: { order_by: "date", title },
      headers: getHeaders(),
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });

export const getTitleCountries = (titleId: number): Promise<TitleCountries> =>
  axios
    .get(TITLE_COUNTRIES_API_URL, {
      params: { netflix_id: titleId },
      headers: getHeaders(),
    })
    .then((response) => response.data)
    .catch((error) => {
      throw error;
    });
