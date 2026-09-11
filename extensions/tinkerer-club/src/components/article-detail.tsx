import { Action, ActionPanel, Color, Detail, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { TinkererArticles } from "../api/articles";
import { articleMarkdown, ClubArticle, mergeArticle } from "../lib/article";
import { errorMessage } from "../lib/json";

function authorText(article: ClubArticle): string {
  return article.author.username ? `${article.author.name} · @${article.author.username}` : article.author.name;
}

function dateText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function avatar(article: ClubArticle) {
  return article.author.avatarUrl
    ? { source: article.author.avatarUrl, mask: Image.Mask.Circle }
    : { source: Icon.Person, tintColor: Color.SecondaryText };
}

function ArticleListMetadata({ article }: { article: ClubArticle }) {
  const published = dateText(article.publishedAt);
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Author" text={authorText(article)} icon={avatar(article)} />
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={article.isDraft ? "✏️ Draft" : "📖 Published"}
          color={article.isDraft ? Color.Orange : Color.Blue}
        />
      </List.Item.Detail.Metadata.TagList>
      {published ? <List.Item.Detail.Metadata.Label title="Published" text={published} icon={Icon.Calendar} /> : null}
      {article.readingTimeMinutes ? (
        <List.Item.Detail.Metadata.Label
          title="Reading time"
          text={`${article.readingTimeMinutes} min`}
          icon={Icon.Clock}
        />
      ) : null}
      {article.topics.length ? (
        <List.Item.Detail.Metadata.TagList title="Topics">
          {article.topics.map((topic) => (
            <List.Item.Detail.Metadata.TagList.Item key={topic} text={topic} color={Color.Purple} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      {article.url ? <List.Item.Detail.Metadata.Link title="Link" text="Open article" target={article.url} /> : null}
    </List.Item.Detail.Metadata>
  );
}

function ArticleDetailMetadata({ article }: { article: ClubArticle }) {
  const published = dateText(article.publishedAt);
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Author" text={authorText(article)} icon={avatar(article)} />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={article.isDraft ? "✏️ Draft" : "📖 Published"}
          color={article.isDraft ? Color.Orange : Color.Blue}
        />
      </Detail.Metadata.TagList>
      {published ? <Detail.Metadata.Label title="Published" text={published} icon={Icon.Calendar} /> : null}
      {article.readingTimeMinutes ? (
        <Detail.Metadata.Label title="Reading time" text={`${article.readingTimeMinutes} min`} icon={Icon.Clock} />
      ) : null}
      {article.topics.length ? (
        <Detail.Metadata.TagList title="Topics">
          {article.topics.map((topic) => (
            <Detail.Metadata.TagList.Item key={topic} text={topic} color={Color.Purple} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {article.url ? <Detail.Metadata.Link title="Link" text="Open article" target={article.url} /> : null}
    </Detail.Metadata>
  );
}

function articleDirectoryUrl(baseUrl: string): string {
  return new URL("/articles", `${baseUrl}/`).toString();
}

function ArticleActions({ article, articles }: { article: ClubArticle; articles: TinkererArticles }) {
  const text = article.content ?? article.excerpt;
  return (
    <ActionPanel>
      {article.url ? (
        <Action.OpenInBrowser title="Open Article in Browser" url={article.url} icon={Icon.Globe} />
      ) : null}
      {text ? <Action.CopyToClipboard title="Copy Article Text" content={text} /> : null}
      <Action.CopyToClipboard title="Copy Article Title" content={article.title} />
      <Action.OpenInBrowser
        title="Open Articles on Tinkerer Club"
        url={articleDirectoryUrl(articles.client.baseUrl)}
        icon={Icon.Book}
      />
    </ActionPanel>
  );
}

export function ArticleItemDetail({ article }: { article: ClubArticle }) {
  return <List.Item.Detail markdown={articleMarkdown(article)} metadata={<ArticleListMetadata article={article} />} />;
}

export function ArticleDetail({ article: summary, articles }: { article: ClubArticle; articles: TinkererArticles }) {
  const [detail, setDetail] = useState<ClubArticle>();
  const [isLoading, setIsLoading] = useState(true);
  const article = useMemo(() => mergeArticle(summary, detail), [detail, summary]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      try {
        setDetail(await articles.get(summary.id, summary.isDraft, controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load Full Article",
          message: errorMessage(error),
        });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [articles, summary.id, summary.isDraft]);

  return (
    <Detail
      actions={<ArticleActions article={article} articles={articles} />}
      isLoading={isLoading}
      markdown={articleMarkdown(article)}
      metadata={<ArticleDetailMetadata article={article} />}
      navigationTitle="Article"
    />
  );
}
