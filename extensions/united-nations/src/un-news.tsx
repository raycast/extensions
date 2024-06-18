import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { fetchUnNews } from "./api.js";
import { NewsDetail, StopTextToSpeech } from "./components.js";
import { i18n } from "./i18n.js";
import { UnNews, NewsRegion, NewsTopic, NewsType } from "./types.js";

export default function () {
  const [isLoading, setIsLoading] = useState(true);
  const [newsList, setNewsList] = useState<UnNews[]>([]);
  const [newsType, setNewsType] = useState<NewsType>("all");

  const loadNews = async (newsType: NewsType) => {
    setIsLoading(true);
    const newsList = await fetchUnNews(newsType);
    setNewsList(newsList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNews(newsType);
  }, [newsType]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={i18n.searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip={i18n.selectNewsType}
          defaultValue="all"
          onChange={(value) => setNewsType(value as NewsType)}
        >
          <List.Dropdown.Item title={i18n.newsType.all} value="all" />
          <List.Dropdown.Section title={i18n.viewByRegion}>
            {Object.entries(NewsRegion).map(([, value]) => (
              <List.Dropdown.Item key={value} title={i18n.newsType[value]} value={value} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={i18n.viewByTopic}>
            {Object.entries(NewsTopic).map(([, value]) => (
              <List.Dropdown.Item key={value} title={i18n.newsType[value]} value={value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {newsList.map((news, index) => {
        const date = new Date(news.pubDate).toLocaleDateString();
        return (
          <List.Item
            key={`news-${index}`}
            title={news.title}
            accessories={[{ text: date }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Snippets} title="View Summary" target={<NewsDetail news={news} />} />
                <StopTextToSpeech />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
