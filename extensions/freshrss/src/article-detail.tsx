import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Color, Detail, Icon, Toast, showToast } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { api, type Article } from "./api";
import { cleanTitle } from "./article-list";

const nhm = new NodeHtmlMarkdown({
  bulletMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  useInlineLinks: true,
});

/**
 * Convert HTML from RSS feeds to clean markdown.
 * Instead of fighting with NodeHtmlMarkdown on block-level elements,
 * we split HTML into segments by block boundaries (<p>, <br>, <div>, etc.),
 * convert each segment separately with NodeHtmlMarkdown (which handles inline
 * formatting like <b>, <i>, <a> well), then join with paragraph breaks.
 */
function htmlToMarkdown(html: string): string {
  let clean = html;
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, "");
  clean = clean.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const converted = nhm.translate(clean);
  return converted.replace(/\uFFFC/g, "").trim();
}

export function isRead(article: Article): boolean {
  return article.categories?.some((c) => c.endsWith("/state/com.google/read")) ?? false;
}

export function isStarred(article: Article): boolean {
  return article.categories?.some((c) => c.endsWith("/state/com.google/starred")) ?? false;
}

export function getArticleUrl(article: Article): string {
  return article.alternate?.[0]?.href ?? "";
}

function formatMarkdown(article: Article, rawMarkdown: string): string {
  const parts: string[] = [];

  parts.push(`# ${cleanTitle(article.title) || "Untitled"}`);

  parts.push("---");
  parts.push("");

  const body = rawMarkdown.trim();
  parts.push(body || "*No content available*");

  return parts.join("\n\n");
}

function getArticleContent(article: Article): string {
  const html = article.content?.content ?? article.summary?.content ?? "";
  if (!html) return "";
  const md = htmlToMarkdown(html);
  return formatMarkdown(article, md);
}

export function formatArticleMarkdown(article: Article): string {
  return getArticleContent(article);
}

interface ArticleDetailProps {
  article: Article;
  onToggleRead?: (article: Article, markRead: boolean) => void;
  onToggleStar?: (article: Article, star: boolean) => void;
  extraActions?: React.ReactNode;
}

export default function ArticleDetail({ article, onToggleRead, onToggleStar, extraActions }: ArticleDetailProps) {
  const [read, setRead] = useState(isRead(article));
  const [starred, setStarred] = useState(isStarred(article));
  const url = getArticleUrl(article);

  useEffect(() => {
    if (!read) {
      api
        .markAsRead(article.id)
        .then(() => {
          setRead(true);
          onToggleRead?.(article, true);
        })
        .catch((err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to mark as read",
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }
  }, []);
  const content = useMemo(() => getArticleContent(article), [article]);
  const displayTitle = cleanTitle(article.title) || "Untitled";

  const handleToggleRead = async () => {
    const newRead = !read;
    try {
      if (newRead) {
        await api.markAsRead(article.id);
      } else {
        await api.markAsUnread(article.id);
      }
      setRead(newRead);
      onToggleRead?.(article, newRead);
      showToast({ style: Toast.Style.Success, title: newRead ? "Marked as read" : "Marked as unread" });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleToggleStar = async () => {
    const newStarred = !starred;
    try {
      if (newStarred) {
        await api.star(article.id);
      } else {
        await api.unstar(article.id);
      }
      setStarred(newStarred);
      onToggleStar?.(article, newStarred);
      showToast({ style: Toast.Style.Success, title: newStarred ? "Starred" : "Unstarred" });
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <Detail
      markdown={content}
      navigationTitle={displayTitle}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={displayTitle} />
          <Detail.Metadata.Label title="Source" text={article.origin?.title || "—"} />
          <Detail.Metadata.Label title="Author" text={article.author || "—"} />
          <Detail.Metadata.Label
            title="Published"
            text={article.published ? new Date(article.published * 1000).toLocaleString() : "—"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={read ? "Read" : "Unread"}
              color={read ? Color.SecondaryText : Color.Blue}
              icon={read ? Icon.CheckCircle : Icon.CircleFilled}
            />
            {starred && <Detail.Metadata.TagList.Item text="Starred" color={Color.Yellow} icon={Icon.Star} />}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Link
            title="URL"
            target={url || ""}
            text={url ? (url.length > 40 ? url.slice(0, 40) + "..." : url) : "—"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {url ? <Action.OpenInBrowser url={url} /> : null}
            {url ? (
              <Action.CopyToClipboard
                content={url}
                title="Copy URL"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Reading">
            <Action
              title={read ? "Mark as Unread" : "Mark as Read"}
              icon={read ? Icon.Circle : Icon.CheckCircle}
              onAction={handleToggleRead}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
            <Action
              title={starred ? "Unstar" : "Star"}
              icon={Icon.Star}
              onAction={handleToggleStar}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
          {extraActions ? <ActionPanel.Section>{extraActions}</ActionPanel.Section> : null}
        </ActionPanel>
      }
    />
  );
}
