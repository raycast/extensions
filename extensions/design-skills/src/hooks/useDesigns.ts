import { useCachedPromise } from "@raycast/utils";
import { scrapeDesigns } from "../utils/scrape";
import { DesignSkill, getRawDesignMdUrl, getSiteUrl } from "../shared";

export function useDesigns() {
  return useCachedPromise(
    async (): Promise<DesignSkill[]> => {
      const scraped = await scrapeDesigns();
      return scraped
        .map(
          (d): DesignSkill => ({
            slug: d.slug,
            name: d.name,
            category: d.category,
            description: d.description,
            designMdUrl: getRawDesignMdUrl(d.slug),
            siteUrl: getSiteUrl(d.slug),
          }),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
    { initialData: [] as DesignSkill[], keepPreviousData: true },
  );
}
