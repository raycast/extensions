import axios, { AxiosResponse } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const preferences = getPreferenceValues();
const omdbUrl = "https://www.omdbapi.com/";
const watchModeBaseUrl = "https://api.watchmode.com/v1/";
const OMDB_TOKEN = preferences.omdbToken;
const WATCHMODE_API_KEY = preferences.watchModeApiKey;
const region = preferences.region;

export async function searchTitles(query: string, type: string) {
  try {
    const params = {
      s: query,
      apikey: OMDB_TOKEN,
      type: type === "all" ? "" : type,
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    if (response.data.Error) {
      throw new Error(response.data.Error);
    }

    return response.data.Search;
  } catch (error) {
    showFailureToast(error, { title: "Could not search movies and shows" });
    throw error;
  }
}
export async function searchSeries(id: string, season?: number) {
  try {
    const params = {
      i: id,
      apikey: OMDB_TOKEN,
      Season: season || "",
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    return response.data;
  } catch (error) {
    showFailureToast(error, { title: "Could not search series information" });
    throw error;
  }
}
export async function searchID(id: string) {
  try {
    const params = {
      i: id,
      apikey: OMDB_TOKEN,
      plot: "full",
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    return response.data;
  } catch (error) {
    showFailureToast(error, { title: "Could not search movie or show" });
    throw error;
  }
}

export async function getProviders(id: string) {
  try {
    const params = {
      apiKey: WATCHMODE_API_KEY,
      append_to_response: "sources",
      regions: region,
    };
    const response: AxiosResponse = await axios.get(watchModeBaseUrl + `title/${id}/details`, { params });

    return response.data.sources;
  } catch (error) {
    showFailureToast(error, { title: "Could not search movie or show" });
    throw error;
  }
}

export async function getSourceIcons() {
  try {
    const params = {
      apiKey: WATCHMODE_API_KEY,
    };
    const response: AxiosResponse = await axios.get(watchModeBaseUrl + "sources", { params });
    const data = response.data;
    return data;
  } catch (error) {
    showFailureToast(error, { title: "Could not fetch source icons" });
    throw error;
  }
}

export async function getFilteredProviders(imdbID: string) {
  try {
    const providers = await getProviders(imdbID);
    if (providers && Array.isArray(providers)) {
      interface Provider {
        source_id: string;
        region: string;
        source_name: string;
        display_priority: number;
        logo_path: string;
        [key: string]: unknown;
      }

      const uniqueProviders = providers.reduce((acc: Provider[], current: Provider) => {
        const x = acc.find((item: Provider) => item.source_id === current.source_id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      return uniqueProviders;
    } else {
      showFailureToast("No provider data available or invalid format", { title: "Could not fetch providers" });
      return [];
    }
  } catch (error) {
    showFailureToast(error, { title: "Could not fetch providers" });
    throw error;
  }
}
