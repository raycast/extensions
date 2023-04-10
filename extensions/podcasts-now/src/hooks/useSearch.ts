import { useFetch } from "@raycast/utils";
import { map } from "lodash";

import { Itunes } from "../itunes";

interface FeedItem {
  id: number;
  title: string;
  artist: string;
  feed: string;
  image: string;
  releaseDate: Date;
  genre: string;
  eposidesCount: number;
}

export function useSearch(term: string) {
  const searchParams = new URLSearchParams();
  searchParams.append("media", "podcast");
  searchParams.append("term", term);

  return useFetch<FeedItem[]>(`https://itunes.apple.com/search?${searchParams}`, {
    parseResponse: async (res) => {
      const json: Itunes.Response = await res.json();
      return map(json.results, (item) => {
        return {
          id: item.trackId,
          title: item.trackName,
          artist: item.artistName,
          feed: item.feedUrl,
          image: item.artworkUrl30,
          releaseDate: new Date(item.releaseDate),
          genre: item.primaryGenreName,
          eposidesCount: item.trackCount,
        };
      });
    },
  });
}
