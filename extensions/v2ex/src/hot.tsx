import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { preferences } from "@raycast/api";
import HttpsProxyAgent from "https-proxy-agent";

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
      subtitle={article.node.title}
      icon={article.member.avatar_normal}
      accessoryTitle={new Date(article.last_modified * 1000).toLocaleDateString()}
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
    const proxy: string = preferences.proxy?.value as string;
    const proxyAgent = proxy ? new (HttpsProxyAgent as any)(proxy) : undefined;
    const response = await fetch("https://www.v2ex.com/api/topics/hot.json", { agent: proxyAgent });
    const json = await response.json();
    return (json as []).map((item: any) => ({ ...item, id: String(item.id) })) as Article[];
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
  last_modified: number;
  node: {
    title: string;
  };
  member: {
    avatar_normal: string;
  };
};
