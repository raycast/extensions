import { useCachedPromise } from "@raycast/utils";
import { fetchDownloadCount } from "../utils/github";

export function useDownloadCounts(slugs: string[]) {
  const key = slugs.join(",");
  return useCachedPromise(
    async (k: string): Promise<Record<string, number>> => {
      const list = k ? k.split(",") : [];
      if (list.length === 0) return {};
      const results = await Promise.all(list.map(async (slug) => [slug, await fetchDownloadCount(slug)] as const));
      const counts: Record<string, number> = {};
      for (const [slug, count] of results) {
        if (count !== null) counts[slug] = count;
      }
      return counts;
    },
    [key],
    { initialData: {} as Record<string, number>, keepPreviousData: true },
  );
}
