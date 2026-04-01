import { useCallback, useEffect, useState } from "react";
import { Action, Detail, Icon, Toast, showToast } from "@raycast/api";
import { api, type Article } from "./api";
import ArticleDetail from "./article-detail";

export default function Command() {
  const [article, setArticle] = useState<Article | null>(null);

  const loadRandom = useCallback(async () => {
    try {
      const response = await api.getStream("user/-/state/com.google/reading-list", {
        excludeTag: "user/-/state/com.google/read",
        count: 50,
      });
      if (response.items.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "No unread articles found" });
        return;
      }
      const random = response.items[Math.floor(Math.random() * response.items.length)];
      setArticle(random);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading article",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    loadRandom();
  }, []);

  if (!article) {
    return <Detail isLoading={true} markdown="" />;
  }

  return (
    <ArticleDetail
      article={article}
      onToggleRead={(updatedArticle, markRead) => {
        setArticle({
          ...updatedArticle,
          categories: markRead
            ? [
                ...updatedArticle.categories.filter((c) => c !== "user/-/state/com.google/read"),
                "user/-/state/com.google/read",
              ]
            : updatedArticle.categories.filter((c) => c !== "user/-/state/com.google/read"),
        });
      }}
      onToggleStar={(updatedArticle, markStarred) => {
        setArticle({
          ...updatedArticle,
          categories: markStarred
            ? [
                ...updatedArticle.categories.filter((c) => c !== "user/-/state/com.google/starred"),
                "user/-/state/com.google/starred",
              ]
            : updatedArticle.categories.filter((c) => c !== "user/-/state/com.google/starred"),
        });
      }}
      extraActions={
        <>
          <Action
            title="Try Another Random Article"
            icon={Icon.Shuffle}
            onAction={loadRandom}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Mark as Read & Try Another"
            icon={Icon.CheckCircle}
            onAction={async () => {
              try {
                await api.markAsRead(article.id);
                showToast({ style: Toast.Style.Success, title: "Marked as read" });
                loadRandom();
              } catch {
                showToast({ style: Toast.Style.Failure, title: "Failed to mark as read" });
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </>
      }
    />
  );
}
