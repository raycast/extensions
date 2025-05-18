import axios, { AxiosResponse } from "axios";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const omdbUrl = "http://www.omdbapi.com/";
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
    console.error("Error searching movies and shows:", error);
    return [];
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
    console.error("Error searching series information:", error);
    return null;
  }
}
export async function searchID(id: string) {
  try {
    const params = {
      i: id,
      apikey: OMDB_TOKEN,
    };
    const response: AxiosResponse = await axios.get(omdbUrl, { params });

    return response.data;
  } catch (error) {
    console.error("Error searching movie or show:", error);
    return null;
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
    console.error("Error searching movie or show:", error);
    return null;
  }
}

export async function getSourceIcons() {
  const response: AxiosResponse = await axios.get(`https://api.watchmode.com/v1/sources/?apiKey=${WATCHMODE_API_KEY}`);
  const data = response.data;
  return data;
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
      console.log("No provider data available or invalid format");
      return [];
    }
  } catch (error) {
    console.error("Error fetching providers:", error);
    return [];
  }
}

export default Request;
