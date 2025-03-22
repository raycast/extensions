import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { LilNews, LilArticle } from "./interface/lilnews";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const lilNews = useFetch("https://api.lil.software/news", {
    parseResponse: async (response) => {
      const data = (await response.json()) as LilNews;
      if (data.articles?.length > 0) {
        return data.articles as LilArticle[];
      }
    },
    initialData: [],
  });

  return (
    <List isLoading={lilNews.isLoading} isShowingDetail>
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
    </List>
  );
}
