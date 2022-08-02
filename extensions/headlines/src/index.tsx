import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { ANews } from "./interface/anews";
import { LilNews, LilArticle } from "./interface/lilnews";
import fetch from "node-fetch";

export default function Command() {
  const [lilnews, setLilNews] = useState<LilArticle[]>([]);
  const [aNews, setANews] = useState<ANews[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLilnews = async () => {
    const response = await fetch("https://api.lil.software/news");
    const data = (await response.json()) as LilNews;
    setLilNews(data.articles);
  };
  const fetchAnews = async () => {
    const response = await fetch("https://api.aayushp.com.np/c/news?region=" + getPreferenceValues().region);
    const data = (await response.json()) as ANews[];
    setANews(data);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchLilnews();
    fetchAnews();
    setIsLoading(false);
  }, []);

  return (
    <List enableFiltering={true} navigationTitle="Headlines" isLoading={isLoading} isShowingDetail>
      <List.Section title="General">
        {lilnews.map((article) => {
          return (
            <List.Item
              key={article.url}
              id={article.url}
              icon={article.image}
              title={article.title || article.source}
              detail={
                <List.Item.Detail
                  markdown={`![](${article.image})
                    **${article.title}**

  ${article.description}
                    `}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={article.url} title="View Article"></Action.OpenInBrowser>
                </ActionPanel>
              }
            ></List.Item>
          );
        })}
      </List.Section>
      <List.Section title="Entertaintment">
        {aNews.map((article) => {
          return (
            <List.Item
              key={article.url}
              id={article.url}
              icon={article.urlToImage || Icon.Camera}
              title={article.title || article.source_name}
              detail={
                <List.Item.Detail
                  markdown={`![](${article.urlToImage || Icon.Camera})
                    **${article.title}**

  ${article.description}
                    `}
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={article.url} title="View Article"></Action.OpenInBrowser>
                </ActionPanel>
              }
            ></List.Item>
          );
        })}
      </List.Section>
    </List>
  );
}
