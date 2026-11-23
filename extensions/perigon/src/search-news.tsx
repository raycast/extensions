import { ActionPanel, Action, Image, Keyboard, List } from "@raycast/api";
import { usePromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { faviconMarkdown, loadCircularFavicon, sourceFaviconUrl, type FaviconImage } from "./lib/favicon";
import { LoadFailureEmptyView } from "./lib/load-failure-empty-view";
import { searchArticles } from "./lib/perigon-api";
import { perigonOAuth } from "./lib/perigon-oauth";
import type { PerigonArticle } from "./lib/types";

function SearchNews() {
  const [searchText, setSearchText] = useState("");
  const queryReady = searchText.trim().length > 0;

  const { data, isLoading, error, revalidate } = usePromise(
    async (query: string, ready: boolean) => {
      if (!ready) {
        return [] as PerigonArticle[];
      }
      return searchArticles(query.trim());
    },
    [searchText, queryReady],
    {
      failureToastOptions: {
        title: "Could not search news",
      },
    },
  );

  const articles = data ?? [];

  const listProps = {
    isLoading,
    onSearchTextChange: setSearchText,
    searchBarPlaceholder: "Search Perigon news articles…",
    throttle: true as const,
    isShowingDetail: articles.length > 0,
    filtering: false as const,
  };

  if (queryReady && error) {
    return (
      <List {...listProps}>
        <LoadFailureEmptyView title="Search failed" description={error.message} revalidate={revalidate} />
      </List>
    );
  }

  return (
    <List {...listProps}>
      {!queryReady ? (
        <List.EmptyView title="Search Perigon" description="Enter a topic, company, or keyword to search articles." />
      ) : !isLoading && articles.length === 0 ? (
        <List.EmptyView title="No articles" description="No articles matched your query." />
      ) : (
        articles.map((article) => <ArticleListItem key={article.articleId} article={article} />)
      )}
    </List>
  );
}

function ArticleListItem({ article }: { article: PerigonArticle }) {
  const { data: favicon } = usePromise(
    async (domain: string) => (domain ? loadCircularFavicon(domain) : undefined),
    [article.sourceDomain],
  );

  return (
    <List.Item
      title={article.title}
      accessories={
        article.sourceDomain
          ? [
              {
                icon: favicon
                  ? { source: favicon.path }
                  : { source: sourceFaviconUrl(article.sourceDomain), mask: Image.Mask.Circle },
                tooltip: article.sourceDomain,
              },
            ]
          : undefined
      }
      detail={<List.Item.Detail markdown={buildArticleMarkdown(article, favicon)} />}
      actions={
        <ActionPanel>
          {article.url ? (
            <Action.OpenInBrowser title="Open in Browser" url={article.url} />
          ) : (
            <Action title="No URL" onAction={() => undefined} />
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Link"
              content={article.url || article.title}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Title" content={article.title} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildArticleMarkdown(article: PerigonArticle, favicon: FaviconImage | undefined): string {
  const lines = [`# ${article.title}`, ""];
  if (article.description) {
    lines.push(article.description, "");
  }
  if (article.pubDate) {
    lines.push(`**Published:** ${formatDate(article.pubDate)}`, "");
  }
  if (article.url) {
    const icon = favicon ? `${faviconMarkdown(favicon, article.sourceDomain || "Source")} ` : "";
    lines.push(`${icon}[${article.url}](${article.url})`);
  }
  return lines.join("\n");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default withAccessToken(perigonOAuth)(SearchNews);
