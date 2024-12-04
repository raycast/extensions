import { useCachedPromise } from "@raycast/utils";
import { getAllShortLinks, getShortLinksCount } from "@/api";
import { LinkSchema } from "dub/dist/commonjs/models/components";

export type ShortLinksResponse = {
  shortLinks: LinkSchema[];
  hasMoreLinks: boolean;
};

export const useShortLinks = (query?: string) => {
  const { data, isLoading, error, mutate } = useCachedPromise(
    async (_query?: string) => {
      const [shortLinks, linksCount] = await Promise.all([
        await getAllShortLinks(_query),
        await getShortLinksCount(_query),
      ]);

      return { shortLinks, hasMoreLinks: linksCount > shortLinks.length } as ShortLinksResponse;
    },
    [query],
    { failureToastOptions: { title: "❗ Failed to fetch short links" } },
  );

  return {
    shortLinks: data?.shortLinks,
    mutate,
    isLoading: (!data && !error) || isLoading,
    error,
    supportsLinksTypeahead: (query ?? "").trim().length > 0 || data?.hasMoreLinks,
  };
};
