import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { getDevToken, getMusicUserToken, getStorefront } from "./auth-utils";
import fetch, { RequestInit } from "node-fetch";
import { AppleMusicRecommendation, AppleMusicSearchResults } from "../types";

export async function fetchAppleMusic(url: string, options: RequestInit = {}) {
  const musicUserToken = await getMusicUserToken();
  const urlWithStorefront = url.replace("{storefront}", await getStorefront())
  return fetch(`https://api.music.apple.com${urlWithStorefront}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${await getDevToken()}`,
      Origin: "https://raycast-music-login.gbgk.dev",
      ...(musicUserToken ? { "Music-User-Token": musicUserToken } : {}),
      ...options.headers,
    },
  }).then((response) => {
    if (response.status === 401) {
      LocalStorage.removeItem("music-user-token");
      throw new Error("Unauthorized");
    }

    return response;
  });
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<AppleMusicRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem("recommendations").then(async (cachedRecommendations) => {
      if (cachedRecommendations) {
        setRecommendations(JSON.parse(cachedRecommendations as string));
        setIsLoading(false);
      }

      const { data } = (await fetchAppleMusic("/v1/me/recommendations").then((response) => response.json())) as {
        data: AppleMusicRecommendation[];
      };

      setRecommendations(data);
      await LocalStorage.setItem("recommendations", JSON.stringify(data));
      setIsLoading(false);
    });
  }, []);

  return { recommendations, isLoading };
}

export function useSearch() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<AppleMusicSearchResults>({
    songs: { data: [] },
    albums: { data: [] },
    artists: { data: [] },
    playlists: { data: [] },
    stations: { data: [] },
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchText !== "") {
      setIsLoading(true);

      const url = `/v1/catalog/{storefront}/search?term=${encodeURIComponent(
        searchText
      )}&types=songs,stations,albums,playlists,artists&limit=5`;

      fetchAppleMusic(url)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          setResults((data as { results: AppleMusicSearchResults }).results);
          setIsLoading(false);
        });
    }
  }, [searchText]);

  return { searchText, setSearchText, results, isLoading };
}
