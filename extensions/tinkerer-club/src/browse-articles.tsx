import { Action, ActionPanel, Color, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ArticleView, TinkererArticles } from "./api/articles";
import { getApiClient } from "./api/preferences";
import { ArticleDetail, ArticleItemDetail } from "./components/article-detail";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { ClubArticle } from "./lib/article";
import { errorMessage } from "./lib/json";

function publishedDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function authorText(article: ClubArticle): string {
  return article.author.username ? `${article.author.name} · @${article.author.username}` : article.author.name;
}

function articleIcon(article: ClubArticle) {
  if (article.coverUrl) return { source: article.coverUrl, mask: Image.Mask.RoundedRectangle };
  return { source: article.isDraft ? Icon.Pencil : Icon.Book, tintColor: article.isDraft ? Color.Orange : Color.Blue };
}

export default function BrowseArticlesCommand() {
  const client = useMemo(() => getApiClient(), []);
  const articlesApi = useMemo(() => new TinkererArticles(client), [client]);
  const [articles, setArticles] = useState<ClubArticle[]>([]);
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<ArticleView>("published");
  const debouncedQuery = useDebouncedValue(query, 250);
  const reload = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setFailure(undefined);
      try {
        setArticles(await articlesApi.list(view, debouncedQuery, controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = errorMessage(error);
        setFailure(message);
        setArticles([]);
        await showToast({ style: Toast.Style.Failure, title: "Could Not Load Articles", message });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [articlesApi, debouncedQuery, revision, view]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles, authors, and topics"
      searchBarAccessory={
        <List.Dropdown tooltip="Article Library" value={view} onChange={(value) => setView(value as ArticleView)}>
          <List.Dropdown.Item title="Published Articles" value="published" icon={Icon.Book} />
          <List.Dropdown.Item title="My Drafts" value="drafts" icon={Icon.Pencil} />
        </List.Dropdown>
      }
      throttle
    >
      <List.Section
        title={view === "drafts" ? "My drafts" : "Published articles"}
        subtitle={`${articles.length} ${articles.length === 1 ? "article" : "articles"}`}
      >
        {articles.map((article) => (
          <List.Item
            key={article.id}
            accessories={[
              ...(article.readingTimeMinutes ? [{ text: `⏱ ${article.readingTimeMinutes} min` }] : []),
              ...(publishedDate(article.publishedAt) ? [{ date: publishedDate(article.publishedAt) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Article"
                  icon={Icon.Book}
                  target={<ArticleDetail article={article} articles={articlesApi} />}
                />
                {article.url ? <Action.OpenInBrowser title="Open Article in Browser" url={article.url} /> : null}
                <Action.CopyToClipboard title="Copy Article Title" content={article.title} />
                <Action title="Reload Articles" icon={Icon.ArrowClockwise} onAction={reload} />
                <Action.OpenInBrowser
                  title="Open Articles on Tinkerer Club"
                  url={new URL("/articles", `${client.baseUrl}/`).toString()}
                  icon={Icon.Globe}
                />
              </ActionPanel>
            }
            detail={<ArticleItemDetail article={article} />}
            icon={articleIcon(article)}
            keywords={[article.author.name, article.author.username ?? "", article.title, ...article.topics]}
            subtitle={authorText(article)}
            title={article.title}
          />
        ))}
      </List.Section>
      {!isLoading && articles.length === 0 ? (
        <List.EmptyView
          title={failure ? "Could Not Load Articles" : view === "drafts" ? "No Article Drafts" : "No Articles Found"}
          description={failure ?? (query ? "Try a broader search." : "There is nothing to show yet.")}
          icon={failure ? Icon.Warning : view === "drafts" ? Icon.Pencil : Icon.Book}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} />
              <Action.OpenInBrowser
                title="Open Articles on Tinkerer Club"
                url={new URL("/articles", `${client.baseUrl}/`).toString()}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
