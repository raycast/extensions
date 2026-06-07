import { useCachedPromise } from "@raycast/utils";
import { fetchDownloadCount } from "../utils/api";

export function useDownloadCounts(slugs: string[]) {
  const key = slugs.join(",");
  return useCachedPromise(
    async (k: string): Promise<Record<string, number>> => {
      const list = k ? k.split(",") : [];
      if (list.length === 0) return {};
      const counts: Record<string, number> = {};
      const BATCH_SIZE = 10;
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (slug) => [slug, await fetchDownloadCount(slug)] as const));
        for (const [slug, count] of results) {
          if (count !== null) counts[slug] = count;
        }
      }
      return counts;
    },
    [key],
    { initialData: {} as Record<string, number>, keepPreviousData: true },
  );
}
