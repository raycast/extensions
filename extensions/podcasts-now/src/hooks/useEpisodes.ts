import { useCachedPromise } from "@raycast/utils";
import { getEpisodes } from "../feed-parser";

export const useEpisodes = (feed: string) => {
  return useCachedPromise<typeof getEpisodes>(getEpisodes, [feed]);
};
