import { ActionPanel, Action, Icon, List, getPreferenceValues } from "@raycast/api";
import { ANews } from "./interface/anews";
import { Preferences } from "./interface/preferences";
import { LilNews, LilArticle } from "./interface/lilnews";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const lilNews = useFetch("https://api.lil.software/news", {
    parseResponse: async (response) => {
      if (response.status === 404) {
        return [];
      }

      const data = (await response.json()) as LilNews;
      if (data.articles?.length > 0) {
        return data.articles as LilArticle[];
      }
    },
    initialData: [],
  });

  const aNews = useFetch("https://api.aayushp.com.np/c/news?region=" + preferences.region, {
    parseResponse: async (response) => {
      if (response.status === 404) {
        return [];
      }

      return (await response.json()) as ANews[];
    },
    initialData: [],
  });

  return (
    <List isLoading={lilNews.isLoading && aNews.isLoading} isShowingDetail>
      <List.Section title="General">
        {lilNews?.data &&
          lilNews.data.map((article) => {
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
        {typeof aNews.data === "object" &&
          aNews.data.map((article) => {
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
