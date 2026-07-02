import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import type { Track, SongResponse } from "@/types/SongResponse";

interface NowPlayingResult {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
}

const POLL_INTERVAL_MS = 30_000;

export function useNowPlaying(): NowPlayingResult {
  const { username, apikey } = getPreferenceValues<Preferences>();
  const [cachedTrack, setCachedTrack] = useCachedState<Track | null>("now-playing-track", null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchNowPlaying() {
      try {
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apikey}&format=json&limit=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SongResponse;

        const tracks = data.recenttracks?.track ?? [];
        const first = tracks[0] ?? null;
        const playing = first?.["@attr"]?.nowplaying === "true";

        if (!isMounted) return;
        setIsPlaying(playing);
        if (playing && first) setCachedTrack(first);
      } catch {
        if (!isMounted) return;
        setIsPlaying(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchNowPlaying();
    const id = setInterval(fetchNowPlaying, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  return {
    track: isPlaying || isLoading ? cachedTrack : null,
    isPlaying,
    isLoading,
  };
}
