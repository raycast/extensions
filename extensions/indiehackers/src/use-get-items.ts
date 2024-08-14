import { useCachedPromise } from "@raycast/utils";
import Parser from "rss-parser";

const parser = new Parser();
export default function useGetItems(feedUrl: string) {
  const { isLoading, data: items } = useCachedPromise(
    async (url: string) => {
      const feed = await parser.parseURL(url);
      return feed.items
        .filter((item) => item.title)
        .map((item) => ({
          title: `${item.title}`,
          link: `${item.link}`,
          contentSnippet: `${item.contentSnippet}`,
          guid: `${item.guid}`,
          categories: item.categories || [],
          isoDate: `${item.isoDate}`,
        }));
    },
    [feedUrl],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );
  return { isLoading, items };
}
