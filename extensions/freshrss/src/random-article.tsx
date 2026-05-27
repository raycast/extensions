import { useState, useEffect, useCallback, useRef } from "react";
import { Detail, Action, ActionPanel, Icon, getPreferenceValues, showToast, Toast, open, openCommandPreferences } from "@raycast/api";
import { getAllArticles, markArticleRead, markArticleUnread, starArticle, unstarArticle, FreshRSSAuthError, FreshRSSApiError } from "./api/freshrss";
import { saveToReadwise, hasReadwiseToken, ReadwiseError } from "./api/readwise";
import type { Article } from "./api/types";

async function handleToggleRead(article: Article, onDone?: () => void) {
  try {
    if (article.isRead) {
      await markArticleUnread(article.id);
    } else {
      await markArticleRead(article.id);
    }
    await showToast({ style: Toast.Style.Success, title: article.isRead ? "Marked as unread" : "Marked as read" });
    onDone?.();
  } catch (error: unknown) {
    const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to update article state";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

async function handleToggleStar(article: Article, onDone?: () => void) {
  try {
    if (article.isStarred) {
      await unstarArticle(article.id);
    } else {
      await starArticle(article.id);
    }
    await showToast({ style: Toast.Style.Success, title: article.isStarred ? "Unstarred" : "Starred" });
    onDone?.();
  } catch (error: unknown) {
    const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to update article state";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

async function handleSaveToReadwiseAction(article: Article, onDone?: () => void) {
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
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: "Saved to Readwise but failed to mark as read" });
        return;
      }
    }
    onDone?.();
    await showToast({ style: Toast.Style.Success, title: "Saved to Readwise Reader" });
  } catch (error: unknown) {
    const message = error instanceof ReadwiseError ? error.message : "Failed to save to Readwise Reader";
    await showToast({ style: Toast.Style.Failure, title: "Error", message });
  }
}

export default function RandomArticleCommand() {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localIsRead, setLocalIsRead] = useState(false);
  const [localIsStarred, setLocalIsStarred] = useState(false);
  const hasMarkedRef = useRef(false);

  const fetchRandomArticle = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAllArticles();
      if (result.articles.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No Articles", message: "No articles found in your FreshRSS instance." });
        setArticle(null);
        return;
      }
      const randomIndex = Math.floor(Math.random() * result.articles.length);
      const selected = result.articles[randomIndex];
      setArticle(selected);
      setLocalIsRead(!!selected.isRead);
      setLocalIsStarred(!!selected.isStarred);
      hasMarkedRef.current = false;
    } catch (error: unknown) {
      const message =
        error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError
          ? error.message
          : "Failed to load articles. Check your FreshRSS connection.";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
      setArticle(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRandomArticle();
  }, [fetchRandomArticle]);

  useEffect(() => {
    if (article && !article.isRead && !hasMarkedRef.current) {
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.autoMarkAsRead) {
        hasMarkedRef.current = true;
        markArticleRead(article.id).then(() => {
          setLocalIsRead(true);
        }).catch(async (error: unknown) => {
          const message = error instanceof FreshRSSAuthError || error instanceof FreshRSSApiError ? error.message : "Failed to auto-mark as read";
          await showToast({ style: Toast.Style.Failure, title: "Auto Mark as Read Failed", message });
        });
      }
    }
  }, [article]);

  if (!article) {
    return (
      <Detail
        isLoading={isLoading}
        markdown="No article found."
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={fetchRandomArticle} />
          </ActionPanel>
        }
      />
    );
  }

  const contentBody = article.content || article.summary || "No content available.";
  const markdown = `## ${article.title || "Untitled"}\n\n${contentBody}`;

  const metadata = (
    <Detail.Metadata>
      {article.feedTitle ? <Detail.Metadata.Label title="Feed" text={article.feedTitle} /> : null}
      {article.author ? <Detail.Metadata.Label title="Author" text={article.author} /> : null}
      {article.publishedAt ? <Detail.Metadata.Label title="Published" text={new Date(article.publishedAt).toLocaleString()} /> : null}
      {article.updatedAt ? <Detail.Metadata.Label title="Updated" text={new Date(article.updatedAt).toLocaleString()} /> : null}
      <Detail.Metadata.Label title="Status" text={localIsRead ? "Read" : "Unread"} />
      <Detail.Metadata.Label title="Starred" text={localIsStarred ? "Yes" : "No"} />
    </Detail.Metadata>
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={article.title || "Random Article"}
      markdown={markdown}
      metadata={metadata}
      actions={
        <ActionPanel>
          {article.url ? (
            <Action.OpenInBrowser url={article.url} title="Open in Browser" shortcut={{ modifiers: ["cmd"], key: "o" }} />
          ) : null}
          <Action title="Another Random Article" icon={Icon.Shuffle} onAction={fetchRandomArticle} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          {article.url ? (
            <Action.CopyToClipboard content={article.url} title="Copy URL" shortcut={{ modifiers: ["cmd"], key: "c" }} />
          ) : null}
          {article.url ? (
            <Action
              title="Save to Readwise Reader"
              icon={Icon.Bookmark}
              onAction={() => handleSaveToReadwiseAction(article, () => {
                const prefs = getPreferenceValues<Preferences>();
                if (prefs.markReadOnReadwise && !localIsRead) {
                  setLocalIsRead(true);
                }
              })}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            />
          ) : null}
          {article.url ? (
            <Action
              title="Open Readwise Reader"
              icon={Icon.ArrowRight}
              onAction={() => open("https://readwise.io/reader")}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
            />
          ) : null}
          {!localIsRead ? (
            <Action
              title="Mark as Read"
              icon={Icon.Circle}
              onAction={() => handleToggleRead({ ...article, isRead: localIsRead }, () => setLocalIsRead(true))}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          ) : (
            <Action
              title="Mark as Unread"
              icon={Icon.Circle}
              onAction={() => handleToggleRead({ ...article, isRead: localIsRead }, () => setLocalIsRead(false))}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          )}
          {localIsStarred ? (
            <Action
              title="Unstar Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar({ ...article, isStarred: localIsStarred }, () => setLocalIsStarred(false))}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          ) : (
            <Action
              title="Star Article"
              icon={Icon.Star}
              onAction={() => handleToggleStar({ ...article, isStarred: localIsStarred }, () => setLocalIsStarred(true))}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}