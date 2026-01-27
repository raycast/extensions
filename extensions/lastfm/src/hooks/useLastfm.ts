import { useState } from "react";
import fetch from "node-fetch";
import useSWR from "swr";

// Functions
import { getErrorMessage } from "../functions/getErrorMessage";

// Types
import type { SongResponse, Track, TopTrack } from "@/types/SongResponse";

interface Props {
  username: string;
  apikey: string;
  period: string;
  method: "top" | "recent";
  limit: string;
}

const useLastFm = (props: Props) => {
  try {
    const method = props.method === "top" ? "gettoptracks" : "getrecenttracks";

    const [songs, setSongs] = useState<Track[] | TopTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const handleError = (err: unknown) => {
      setError(err);
      setLoading(false);
    };

    const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<SongResponse>);
    useSWR(
      `https://ws.audioscrobbler.com/2.0/?method=user.${method}&user=${props.username}&api_key=${
        props.apikey
      }&format=json&period=${props.period}&limit=${props.limit || 24}`,
      fetcher,
      {
        onSuccess: (data) => {
          if (data.error) {
            const message = getErrorMessage(data.error);
            handleError(new Error(message));
          } else {
            const tracks = data.recenttracks?.track || data.toptracks?.track || [];

            setSongs(tracks);
            setLoading(false);
          }
        },
        onError: handleError,
      },
    );

    return {
      loading,
      error: error?.message || null,
      songs,
    };
  } catch (err: unknown) {
    return {
      loading: false,
      error: (err as any)?.mesage || null,
      songs: [],
    };
  }
};

export default useLastFm;
