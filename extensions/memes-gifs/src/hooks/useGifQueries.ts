import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import fetch from "node-fetch";
import { Gif, TenorResponse } from "../types";

export function useRandomGifs(tenorApiKey: string | null) {
  return useQuery({
    queryKey: ["randomGifs"],
    queryFn: async (): Promise<Gif[]> => {
      if (!tenorApiKey) return [];
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=meme&key=${tenorApiKey}&limit=3&random=true`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = (await response.json()) as TenorResponse;
      return json.results.map((result) => ({
        id: result.id,
        title: result.content_description,
        url: result.media_formats.gif.url,
        previewUrl: result.media_formats.nanogif.url,
      }));
    },
    enabled: !!tenorApiKey,
  });
}

export function useSearchGifs(searchText: string, tenorApiKey: string | null) {
  return useInfiniteQuery({
    queryKey: ["searchGifs", searchText],
    queryFn: async ({ pageParam = "" }): Promise<{ gifs: Gif[]; nextPos: string | null }> => {
      if (!tenorApiKey) return { gifs: [], nextPos: null };
      const url = pageParam
        ? `https://tenor.googleapis.com/v2/search?q=${searchText}&key=${tenorApiKey}&limit=10&pos=${pageParam}`
        : `https://tenor.googleapis.com/v2/search?q=${searchText}&key=${tenorApiKey}&limit=10`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = (await response.json()) as TenorResponse;
      const gifs: Gif[] = json.results.map((result) => ({
        id: result.id,
        title: result.content_description,
        url: result.media_formats.gif.url,
        previewUrl: result.media_formats.tinygif.url,
      }));
      return { gifs, nextPos: json.next };
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextPos,
    enabled: searchText.length > 0 && !!tenorApiKey,
  });
}
