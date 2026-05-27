import { useState, useEffect, useCallback, useRef } from "react";
import { List, Action, ActionPanel, Icon, Color, Detail, getPreferenceValues } from "@raycast/api";
import { showToast, Toast, openCommandPreferences, open } from "@raycast/api";
import type { Article, ArticleListMode } from "../api/types";
import {
  markArticleRead,
  markArticleUnread,
  starArticle,
  unstarArticle,
  FreshRSSAuthError,
  FreshRSSApiError,
} from "../api/freshrss";
import { saveToReadwise, hasReadwiseToken, ReadwiseError } from "../api/readwise";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

type ArticleActionCallbacks = {
  onRefresh?: () => void;
  onLoadMore?: () => Promise<void>;
  onToggleRead?: (articleId: string, isRead: boolean) => void;
  onToggleStar?: (articleId: string, isStarred: boolean) => void;
  onMarkAllAsRead?: () => Promise<void>;
};

async function handleToggleRead(article: Article, isRead: boolean, onDone?: () => void) {
  try {
    if (isRead) {
      await markArticleUnread(article.id);
    } else {
      await markArticleRead(article.id);
    }
    await showToast({
      style: Toast.Style.Success,
      title: isRead ? "Marked as unread" : "Marked as read",
    });
    onDone?.();
  } catch (error: unknown) {
    const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to update article state";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

async function handleToggleStar(article: Article, isStarred: boolean, onDone?: () => void) {
  try {
    if (isStarred) {
      await unstarArticle(article.id);
    } else {
      await starArticle(article.id);
    }
    await showToast({
      style: Toast.Style.Success,
      title: isStarred ? "Unstarred" : "Starred",
    });
    onDone?.();
  } catch (error: unknown) {
    const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to update article state";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

async function handleSaveToReadwise(article: Article, callbacks: ArticleActionCallbacks) {
  if (!article.url) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: "This article has no URL" });
    return;
  }
  if (!hasReadwiseToken()) {
    await openCommandPreferences();
    return;
  }
  try {
    await saveToReadwise({
      url: article.url,
      title: article.title,
      author: article.author,
      summary: article.summary,
    });
    const prefs = getPreferenceValues<Preferences>();
    if (prefs.markReadOnReadwise && !article.isRead) {
      try {
        await markArticleRead(article.id);
        callbacks.onToggleRead?.(article.id, true);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: "Saved to Readwise but failed to mark as read" });
        return;
      }
    }
    callbacks.onRefresh?.();
    await showToast({ style: Toast.Style.Success, title: "Saved to Readwise Reader" });
  } catch (error: unknown) {
    const message = error instanceof ReadwiseError ? error.message : "Failed to save to Readwise Reader";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

async function handleOpenInReadwise() {
  await open("https://readwise.io/reader");
}

type ArticleListProps = {
  articles: Article[];
  isLoading: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  mode: ArticleListMode;
  onToggleRead?: (articleId: string, isRead: boolean) => void;
  onToggleStar?: (articleId: string, isStarred: boolean) => void;
  onMarkAllAsRead?: () => Promise<void>;
  onSearchTextChange?: (text: string) => void;
};

export function ArticleList({ articles, isLoading, onRefresh, onLoadMore, hasMore, mode, onToggleRead, onToggleStar, onMarkAllAsRead, onSearchTextChange }: ArticleListProps) {
  const modeLabel = mode === "unread" ? "Unread Articles" : mode === "read" ? "Read Articles" : mode === "starred" ? "Starred Articles" : "Articles";
  const title = `${modeLabel} (${articles.length})` as const;
  const { autoMarkAsRead } = getPreferenceValues<Preferences>();
  const markedRef = useRef<Set<string>>(new Set());

  const callbacks: ArticleActionCallbacks = {
    onRefresh,
    onLoadMore,
    onToggleRead: onToggleRead || ((_id: string, _isRead: boolean) => { onRefresh?.(); }),
    onToggleStar: onToggleStar || ((_id: string, _isStarred: boolean) => { onRefresh?.(); }),
    onMarkAllAsRead,
  };

  const handleSelectionChange = useCallback((id: string | null) => {
    if (!autoMarkAsRead || !id || id === "__load_more__") return;
    const article = articles.find((a) => a.id === id);
    if (!article || article.isRead || markedRef.current.has(id)) return;
    markedRef.current.add(id);
    markArticleRead(id).then(() => {
      callbacks.onToggleRead?.(id, true);
    }).catch(async (error: unknown) => {
      markedRef.current.delete(id);
      const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to auto-mark as read";
      await showToast({ style: Toast.Style.Failure, title: "Auto Mark as Read Failed", message });
    });
  }, [autoMarkAsRead, articles, callbacks]);

  return (
    <List isLoading={isLoading} navigationTitle={title} searchBarPlaceholder="Search articles..." isShowingDetail onSearchTextChange={onSearchTextChange} onSelectionChange={handleSelectionChange}>
      {articles.length === 0 && !isLoading ? (
        <List.EmptyView
          title={mode === "unread" ? "No unread articles" : mode === "read" ? "No read articles" : "No starred articles"}
          description="Try refreshing or check your FreshRSS connection"
          actions={
            onRefresh ? (
              <ActionPanel>
                <Action title="Refresh" onAction={onRefresh} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <>
          {articles.map((article) => (
            <ArticleListItem key={article.id} article={article} mode={mode} callbacks={callbacks} />
          ))}
          {hasMore && onLoadMore ? (
            <List.Item
              id="__load_more__"
              title="Load more articles..."
              icon={Icon.ArrowDown}
              actions={
                <ActionPanel>
                  <Action title="Load More" onAction={onLoadMore} icon={Icon.ArrowDown} />
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}

type ArticleListItemProps = {
  article: Article;
  mode: ArticleListMode;
  callbacks: ArticleActionCallbacks;
};

function ArticleListItem({ article, mode, callbacks }: ArticleListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (article.isRead !== undefined) {
    accessories.push({
      icon: article.isRead ? { source: Icon.Circle, tintColor: Color.SecondaryText } : { source: Icon.Circle, tintColor: Color.Blue },
      tooltip: article.isRead ? "Read" : "Unread",
    });
  }

  if (article.isStarred !== undefined) {
    accessories.push({
      icon: article.isStarred ? { source: Icon.Star, tintColor: Color.Yellow } : { source: Icon.Star, tintColor: Color.SecondaryText },
      tooltip: article.isStarred ? "Starred" : "Not starred",
    });
  }

  if (article.publishedAt) {
    accessories.push({ text: formatDate(article.publishedAt) });
  }

  const subtitle = [article.feedTitle, article.author].filter(Boolean).join(" · ");

  const contentBody = article.content || article.summary || "No content available.";
  const previewMarkdown = `## ${article.title || "Untitled"}\n\n${contentBody}`;

  const metadata = (
    <List.Item.Detail.Metadata>
      {article.feedTitle ? <List.Item.Detail.Metadata.Label title="Feed" text={article.feedTitle} /> : null}
      {article.author ? <List.Item.Detail.Metadata.Label title="Author" text={article.author} /> : null}
      {article.publishedAt ? <List.Item.Detail.Metadata.Label title="Published" text={new Date(article.publishedAt).toLocaleString()} /> : null}
      {article.updatedAt ? <List.Item.Detail.Metadata.Label title="Updated" text={new Date(article.updatedAt).toLocaleString()} /> : null}
      {article.isRead !== undefined ? <List.Item.Detail.Metadata.Label title="Status" text={article.isRead ? "Read" : "Unread"} /> : null}
      {article.isStarred !== undefined ? <List.Item.Detail.Metadata.Label title="Starred" text={article.isStarred ? "Yes" : "No"} /> : null}
    </List.Item.Detail.Metadata>
  );

  return (
    <List.Item
      id={article.id}
      title={article.title || "Untitled"}
      subtitle={subtitle}
      icon={article.feedIconUrl ? { source: article.feedIconUrl } : undefined}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={previewMarkdown}
          metadata={metadata}
        />
      }
      actions={
        <ActionPanel>
          {article.url ? (
            <Action.OpenInBrowser
              url={article.url}
              title="Open Article in Browser"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : null}
          <Action.Push
            title="View Article"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
            target={<ArticleDetailView article={article} callbacks={callbacks} />}
          />
          {article.url ? (
            <Action.CopyToClipboard
              content={article.url}
              title="Copy Article URL"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
          
          {article.url ? (
            <Action
              title="Save to Readwise Reader"
              icon={Icon.Bookmark}
              onAction={() => handleSaveToReadwise(article, callbacks)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          ) : null}
          {article.url ? (
            <Action
              title="Open Readwise Reader"
              icon={Icon.ArrowRight}
              onAction={handleOpenInReadwise}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
            />
          ) : null}
          {mode !== "starred" && !article.isRead ? (
            <Action
              title="Mark as Read"
              icon={Icon.Circle}
              onAction={() => handleToggleRead(article, false, () => callbacks.onToggleRead?.(article.id, true))}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          ) : null}
          {mode !== "starred" && article.isRead ? (
            <Action
              title="Mark as Unread"
              icon={Icon.Circle}
              onAction={() => handleToggleRead(article, true, () => callbacks.onToggleRead?.(article.id, false))}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          ) : null}
          {article.isStarred ? (
            <Action
              title="Unstar Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar(article, true, () => callbacks.onToggleStar?.(article.id, false))}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ) : (
            <Action
              title="Star Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar(article, false, () => callbacks.onToggleStar?.(article.id, true))}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {mode === "unread" && callbacks.onMarkAllAsRead ? (
            <Action
              title="Mark All as Read"
              icon={Icon.Checkmark}
              onAction={callbacks.onMarkAllAsRead}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          ) : null}
          {callbacks.onRefresh ? (
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={callbacks.onRefresh} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} />
          ) : null}
          {callbacks.onLoadMore ? (
            <Action title="Load More" icon={Icon.ArrowDown} onAction={callbacks.onLoadMore} shortcut={{ modifiers: ["cmd"], key: "l" }} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ArticleDetailView({ article, callbacks }: { article: Article; callbacks: ArticleActionCallbacks }) {
  const { autoMarkAsRead } = getPreferenceValues<Preferences>();
  const [localIsRead, setLocalIsRead] = useState(article.isRead);
  const hasMarkedRef = useRef(false);

  useEffect(() => {
    if (autoMarkAsRead && !article.isRead && !hasMarkedRef.current) {
      hasMarkedRef.current = true;
      markArticleRead(article.id).then(() => {
        setLocalIsRead(true);
        callbacks.onToggleRead?.(article.id, true);
      }).catch(async (error: unknown) => {
        const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to auto-mark as read";
        await showToast({ style: Toast.Style.Failure, title: "Auto Mark as Read Failed", message });
      });
    }
  }, []);

  const metadata = (
    <Detail.Metadata>
      {article.feedTitle ? <Detail.Metadata.Label title="Feed" text={article.feedTitle} /> : null}
      {article.author ? <Detail.Metadata.Label title="Author" text={article.author} /> : null}
      {article.publishedAt ? <Detail.Metadata.Label title="Published" text={new Date(article.publishedAt).toLocaleString()} /> : null}
      {article.updatedAt ? <Detail.Metadata.Label title="Updated" text={new Date(article.updatedAt).toLocaleString()} /> : null}
      {localIsRead !== undefined ? <Detail.Metadata.Label title="Status" text={localIsRead ? "Read" : "Unread"} /> : null}
      {article.isStarred !== undefined ? <Detail.Metadata.Label title="Starred" text={article.isStarred ? "Yes" : "No"} /> : null}
    </Detail.Metadata>
  );

  const contentBody = article.content || article.summary || "No content available.";
  const markdown = `## ${article.title || "Untitled"}\n\n${contentBody}`;

  return (
    <Detail
      navigationTitle={article.title || "Article"}
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          {article.url ? (
            <Action.OpenInBrowser
              url={article.url}
              title="Open in Browser"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : null}
          {article.url ? (
            <Action.CopyToClipboard
              content={article.url}
              title="Copy URL"
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
          {article.url ? (
            <Action
              title="Save to Readwise Reader"
              icon={Icon.Bookmark}
              onAction={() => handleSaveToReadwise(article, callbacks)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          ) : null}
          {article.url ? (
            <Action
              title="Open Readwise Reader"
              icon={Icon.ArrowRight}
              onAction={handleOpenInReadwise}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
            />
          ) : null}
          {localIsRead !== undefined && !localIsRead ? (
            <Action
              title="Mark as Read"
              icon={Icon.Circle}
              onAction={() => {
                handleToggleRead(article, false, () => {
                  setLocalIsRead(true);
                  callbacks.onToggleRead?.(article.id, true);
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          ) : null}
          {localIsRead ? (
            <Action
              title="Mark as Unread"
              icon={Icon.Circle}
              onAction={() => {
                handleToggleRead(article, true, () => {
                  setLocalIsRead(false);
                  callbacks.onToggleRead?.(article.id, false);
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          ) : null}
          {article.isStarred ? (
            <Action
              title="Unstar Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar(article, true, () => callbacks.onToggleStar?.(article.id, false))}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ) : (
            <Action
              title="Star Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar(article, false, () => callbacks.onToggleStar?.(article.id, true))}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {callbacks.onRefresh ? (
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={callbacks.onRefresh} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}