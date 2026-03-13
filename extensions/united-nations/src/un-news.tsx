import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { fetchUnNews } from "./api.js";
import { NewsDetail, StopTextToSpeech } from "./components.js";
import { i18n } from "./i18n.js";
import { LanguageCode, NewsRegion, NewsTopic, NewsType, UnNews } from "./types.js";
import { latinSearchFilter, lantinSearchLanguages, rightToLeftLanguages } from "./utils.js";

export default function () {
  const preferences = getPreferenceValues<Preferences>();
  const newsLanguageCode = preferences.newsLanguageCode as LanguageCode;
  const [isLoading, setIsLoading] = useState(true);
  const [newsList, setNewsList] = useState<UnNews[]>([]);
  const [newsType, setNewsType] = useState<NewsType>("all");
  const [searchText, setSearchText] = useState<string>("");

  const loadNews = async (newsType: NewsType) => {
    setIsLoading(true);
    const newsList = await fetchUnNews(newsType);
    setNewsList(newsList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNews(newsType);
  }, [newsType]);

  const hasLatinSearch = lantinSearchLanguages.has(newsLanguageCode);
  const isRTL = rightToLeftLanguages.has(newsLanguageCode);

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
      onSearchTextChange={hasLatinSearch ? setSearchText : undefined}
    >
      {(hasLatinSearch && searchText
        ? newsList.filter((news) => latinSearchFilter(newsLanguageCode, news.title, searchText))
        : newsList
      ).map((news, index) => {
        const date = new Date(news.pubDate).toLocaleDateString(newsLanguageCode);
        return (
          <List.Item
            key={`news-${index}`}
            title={isRTL ? "" : news.title}
            subtitle={isRTL ? date : undefined}
            accessories={isRTL ? [{ text: { value: news.title, color: Color.PrimaryText } }] : [{ text: date }]}
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
