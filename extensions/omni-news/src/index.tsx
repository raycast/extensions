import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import json2md from "json2md";
import { useEffect, useState } from "react";
import { fetchArticles } from "./api";
import { Article, iconToEmojiMap } from "./models/article";

export default function omni() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, isLoading] = useState(true);

  async function fetchData() {
    try {
      const articles = await fetchArticles();
      setArticles(articles);
      isLoading(false);
    } catch (error) {
      showToast(Toast.Style.Failure, "No news could be found");
      console.log(error + " from fetchData function");
      isLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Filter news with keyword..."
    >
      <List.EmptyView
        icon={{
          source: Icon.XMarkCircleFilled,
          tintColor: Color.Red,
        }}
        title="No data could be fetched"
      />
      {articles.map((article) => (
        <List.Item
          icon={getIcon(article.category)}
          key={article.article_id}
          title={article.title}
          accessories={[{ text: article.duration.durationLastModified }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={{ source: Icon.Book }}
                title="Read Article"
                target={<OpenArticle {...article} />}
              />
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  url={article.articleLink}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getIcon(category: string) {
  return iconToEmojiMap.get(category) ?? "🤔";
}

function OpenArticle(article: Article) {
  return (
    <Detail
      navigationTitle={article.title}
      markdown={json2md([
        { h1: article.title },
        {
          img: { source: article.imageLink },
        },
        { h3: article.description },
      ])}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={article.articleLink} />
        </ActionPanel>
      }
    />
  );
}
