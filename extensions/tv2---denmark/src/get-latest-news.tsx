import { List } from "@raycast/api";
import { RSS_URL } from "./utils/constants";
import { useFetch } from "@raycast/utils";
import Parser from "rss-parser";
import { useState } from "react";
import NewsListDetail from "./components/newsListDetail";

const parser = new Parser();

export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export default function GetLatestNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const { isLoading } = useFetch(RSS_URL, {
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

  return (
    <List isShowingDetail isLoading={isLoading}>
      {items.map((item) => (
        <NewsListDetail item={item} key={item.link} />
      ))}
    </List>
  );
}
