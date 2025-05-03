import { useFetch } from "@raycast/utils";
import { Episode } from "../types";

export function useEpisodes() {
  return useFetch<Episode[]>("https://syntax.fm/content.json", {
    parseResponse: async (response) => {
      const data = await response.json();
      return data?.blocks;
    },
  });
}
