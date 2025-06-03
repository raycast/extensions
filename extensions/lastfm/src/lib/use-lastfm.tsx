import { useState, useEffect } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  AlbumResponse,
  ArtistResponse,
  LastFmMethod,
  ExtensionPreferences,
  SongResponse,
  UseLastFmResult,
  LastFmParams,
} from "@/types";
import { getErrorMessage } from "./utils";

const API = new URL(`https://ws.audioscrobbler.com/2.0/`);

async function fetchLastFmData<T>(method: LastFmMethod, params?: LastFmParams): Promise<T> {
  const { username, apikey, limit } = getPreferenceValues<ExtensionPreferences>();

  if (!username || !apikey) {
    await showToast(
      Toast.Style.Failure,
      "Configuration Error",
      "Please set your Last.fm username and API key in the extension preferences."
    );
    throw new Error("Last.fm username or API key is missing from preferences.");
  }

  const fields: Record<string, any> = new URLSearchParams({
    method,
    user: username,
    api_key: apikey,
    format: "json",
  });

  if (limit) {
    fields.append("limit", limit);
  } else {
    fields.append("limit", "24"); // Default limit if not provided
  }

  if (params) {
    Object.keys(params).forEach((key) => {
      fields.append(key, params[key]);
    });
  }

  API.search = fields.toString();

  try {
    const response = await fetch(API);
    if (!response.ok) {
      await showToast(Toast.Style.Failure, "Network Error", `HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if ((data as any).error) {
      const lastFmError = (data as any).error as number;
      const message = getErrorMessage(lastFmError);
      await showToast(Toast.Style.Failure, "Last.fm API Error", message);
      throw new Error(message);
    }

    return data as T;
  } catch (e: any) {
    if (!e.message.includes("Last.fm API Error") && !e.message.includes("Configuration Error")) {
      await showToast(Toast.Style.Failure, "Fetching Error", e.message || "An unexpected error occurred.");
    }

    throw e;
  }
}


export function useLastFm<T>(method: LastFmMethod, params?: LastFmParams): UseLastFmResult<T> {
  const { username, apikey, limit, view, period } = getPreferenceValues<ExtensionPreferences>();

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState(Date.now());

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLastFmData<T>(method, params);
      setData(result);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [method, username, apikey, period, limit, view, timestamp]);

  const revalidate = () => {
    setTimestamp(Date.now());
  };

  return { data, loading, error, revalidate };
}

export const useRecentTracks = (params?: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<SongResponse>("user.getrecenttracks", params);
  return {
    songs: data?.recenttracks?.track || [],
    loading,
    error,
    revalidate,
  };
};

export const useTopTracks = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<SongResponse>("user.gettoptracks", params);
  return {
    songs: data?.toptracks?.track || [],
    loading,
    error,
    revalidate,
  };
};

export const useTopAlbums = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<AlbumResponse>("user.gettopalbums", params);
  return {
    albums: data?.topalbums?.album || [],
    loading,
    error,
    revalidate,
  };
};

export const useTopArtists = (params: LastFmParams) => {
  const { data, loading, error, revalidate } = useLastFm<ArtistResponse>("user.gettopartists", params);
  return {
    artists: data?.topartists?.artist || [],
    loading,
    error,
    revalidate,
  };
};
