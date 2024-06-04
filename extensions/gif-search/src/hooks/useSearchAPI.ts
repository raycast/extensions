import { useCachedPromise } from "@raycast/utils";

import { ServiceName, GIF_SERVICE } from "../preferences";
import giphy from "../models/giphy";
import tenor from "../models/tenor";
import finergifs from "../models/finergifs";
import dedupe from "../lib/dedupe";

export async function getAPIByServiceName(service: ServiceName) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return await giphy();
    case GIF_SERVICE.GIPHY_CLIPS:
      return await giphy("videos");
    case GIF_SERVICE.TENOR:
      return await tenor();
    case GIF_SERVICE.FINER_GIFS:
      return finergifs();
    case GIF_SERVICE.FAVORITES:
    case GIF_SERVICE.RECENTS:
      return null;
  }

  throw new Error(`Unable to find API for service "${service}"`);
}

type UseSearchAPIParams = {
  term: string;
  service?: ServiceName;
  offset?: number;
  limit?: number;
};

export default function useSearchAPI({ term, service, limit = 10 }: UseSearchAPIParams) {
  return useCachedPromise(
    (term: string, service?: ServiceName) =>
      async ({ cursor, page }) => {
        if (!service) {
          return { data: [], hasMore: false };
        }

        const api = await getAPIByServiceName(service);
        if (api === null) {
          return { data: [], hasMore: false };
        }

        const { results, next } = term
          ? await api.search(term, { limit, next: cursor, offset: page * limit })
          : await api.trending({ limit, next: cursor, offset: page * limit });

        return { data: dedupe(results), hasMore: next !== "", cursor: next };
      },
    [term, service],
    { keepPreviousData: true },
  );
}
