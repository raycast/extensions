import axios, { AxiosResponse, AxiosError } from "axios";
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
    if (!OMDB_TOKEN || OMDB_TOKEN.trim() === "") {
      throw new Error("OMDb API key is required. Please configure your API key in preferences.");
    }

    const params = {
      s: query,
      apikey: OMDB_TOKEN,
      type: type === "all" ? "" : type,
    };

    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    if (response.data.Error) {
      if (response.data.Error === "Invalid API key!") {
        const errorMessage = "Invalid OMDb API key. Please check your API key in preferences and ensure it's valid.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (response.data.Error.includes("Request limit reached")) {
        const errorMessage = "OMDb API request limit reached. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else {
        throw new Error(response.data.Error);
      }
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const errorMessage =
          "Invalid OMDb API key. Please check your API key in preferences and ensure it's valid and has not exceeded its usage limit.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (axiosError.response?.status === 403) {
        const errorMessage =
          "OMDb API key has exceeded its usage limit. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const errorMessage = "OMDb API server error. Please try again later.";
        showFailureToast(errorMessage, { title: "Server Error" });
        throw new Error(errorMessage);
      }
    }

    showFailureToast(error, { title: "Could not search movies and shows" });
    throw error;
  }
}

export async function searchSeries(id: string, season?: number) {
  try {
    if (!OMDB_TOKEN || OMDB_TOKEN.trim() === "") {
      throw new Error("OMDb API key is required. Please configure your API key in preferences.");
    }

    const params = {
      i: id,
      apikey: OMDB_TOKEN,
      Season: season || "",
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const errorMessage =
          "Invalid OMDb API key. Please check your API key in preferences and ensure it's valid and has not exceeded its usage limit.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (axiosError.response?.status === 403) {
        const errorMessage =
          "OMDb API key has exceeded its usage limit. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const errorMessage = "OMDb API server error. Please try again later.";
        showFailureToast(errorMessage, { title: "Server Error" });
        throw new Error(errorMessage);
      }
    }

    showFailureToast(error, { title: "Could not search series information" });
    throw error;
  }
}

export async function searchID(id: string) {
  try {
    if (!OMDB_TOKEN || OMDB_TOKEN.trim() === "") {
      throw new Error("OMDb API key is required. Please configure your API key in preferences.");
    }

    const params = {
      i: id,
      apikey: OMDB_TOKEN,
      plot: "full",
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const errorMessage =
          "Invalid OMDb API key. Please check your API key in preferences and ensure it's valid and has not exceeded its usage limit.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (axiosError.response?.status === 403) {
        const errorMessage =
          "OMDb API key has exceeded its usage limit. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const errorMessage = "OMDb API server error. Please try again later.";
        showFailureToast(errorMessage, { title: "Server Error" });
        throw new Error(errorMessage);
      }
    }

    showFailureToast(error, { title: "Could not search movie or show" });
    throw error;
  }
}

export async function getProviders(id: string) {
  try {
    if (!WATCHMODE_API_KEY || WATCHMODE_API_KEY.trim() === "") {
      throw new Error("WatchMode API key is required. Please configure your API key in preferences.");
    }

    const params = {
      apiKey: WATCHMODE_API_KEY,
      append_to_response: "sources",
      regions: region,
    };
    const response: AxiosResponse = await axios.get(watchModeBaseUrl + `title/${id}/details`, { params });

    return response.data.sources;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const errorMessage =
          "Invalid WatchMode API key. Please check your API key in preferences and ensure it's valid.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (axiosError.response?.status === 403) {
        const errorMessage =
          "WatchMode API key has exceeded its usage limit. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const errorMessage = "WatchMode API server error. Please try again later.";
        showFailureToast(errorMessage, { title: "Server Error" });
        throw new Error(errorMessage);
      }
    }

    showFailureToast(error, { title: "Could not search movie or show" });
    throw error;
  }
}

export async function getSourceIcons() {
  try {
    if (!WATCHMODE_API_KEY || WATCHMODE_API_KEY.trim() === "") {
      throw new Error("WatchMode API key is required. Please configure your API key in preferences.");
    }

    const params = {
      apiKey: WATCHMODE_API_KEY,
    };
    const response: AxiosResponse = await axios.get(watchModeBaseUrl + "sources", { params });
    const data = response.data;
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        const errorMessage =
          "Invalid WatchMode API key. Please check your API key in preferences and ensure it's valid.";
        showFailureToast(errorMessage, { title: "Authentication Error" });
        throw new Error(errorMessage);
      } else if (axiosError.response?.status === 403) {
        const errorMessage =
          "WatchMode API key has exceeded its usage limit. Please upgrade your plan or wait for the limit to reset.";
        showFailureToast(errorMessage, { title: "API Limit Exceeded" });
        throw new Error(errorMessage);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const errorMessage = "WatchMode API server error. Please try again later.";
        showFailureToast(errorMessage, { title: "Server Error" });
        throw new Error(errorMessage);
      }
    }

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
