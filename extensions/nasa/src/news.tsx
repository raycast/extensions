import { useState } from "react";

import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import Parser from "rss-parser";

import { NewsItem } from "@/types";
import { ENDPOINTS } from "@/constants/preferences";
import ErrorDetail from "@/components/error";
import NewsListDetail from "@/components/newsListDetail";

const parser = new Parser();

export default function GetLatestNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const { isLoading, error } = useFetch(ENDPOINTS.RSS, {
    async onData(data: string) {
      const feed = await parser.parseString(data);
      const items = feed.items.map((item) => ({
        title: item.title || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        description: item["content:encoded"] || "",
      }));

      // Sorting the items by pub date
      items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setItems(items);
    },
    keepPreviousData: true,
    initialData: [],
  });

  return error ? (
    <ErrorDetail error={error} />
  ) : (
    <List isShowingDetail isLoading={isLoading}>
      {!isLoading && items.map((item) => <NewsListDetail item={item} key={item.link} />)}
    </List>
  );
}
