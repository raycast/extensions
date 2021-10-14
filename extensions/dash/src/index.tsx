import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

export default function ArticleList() {
  const [state, setState] = useState<{ articles: Article[] }>({ articles: [] });

  useEffect(() => {
    async function fetch() {
      const articles = await fetchArticles();
      setState((oldState) => ({
        ...oldState,
        articles: articles,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.articles.length === 0} searchBarPlaceholder="Filter articles by name...">
      {state.articles.map((article) => (
        <ArticleListItem key={article.id} article={article} />
      ))}
    </List>
  );
}

function ArticleListItem(props: { article: Article }) {
  const article = props.article;

  return (
    <List.Item
      id={article.id}
      key={article.id}
      title={article.title}
      subtitle="Raycast Blog"
      icon="list-icon.png"
      accessoryTitle={new Date(article.date_modified).toLocaleDateString()}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={article.url} />
          <CopyToClipboardAction title="Copy URL" content={article.url} />
        </ActionPanel>
      }
    />
  );
}

async function fetchArticles(): Promise<Article[]> {
  try {
    const response = await fetch("https://raycast.com/feed.json");
    const json = await response.json();
    return (json as Record<string, unknown>).items as Article[];
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load articles");
    return Promise.resolve([]);
  }
}

type Article = {
  id: string;
  title: string;
  url: string;
  date_modified: string;
};
