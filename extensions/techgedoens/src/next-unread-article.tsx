import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  open,
  popToRoot,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ArticleCopyActions } from "./article-copy-actions";
import {
  ArchivedArticle,
  normalizeArticleRetention,
  refreshArticleArchive,
  setArticleFavoriteStatus,
  setArticleReadStatus,
} from "./article-archive";
import { createArticleDetailMarkdown } from "./article-detail";
import { findNextUnreadArticle, type NextUnreadArticleOrder } from "./next-unread-article-selection";
import { FindRelatedArticlesAction } from "./related-articles";
import { strings } from "./strings";

type ArticleEnterAction = "browser" | "reader";

export default function NextUnreadArticleCommand() {
  const preferences = getPreferenceValues<Preferences.NextUnreadArticle>();
  const translations = strings;
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const order = normalizeOrder(preferences.nextUnreadArticleOrder);
  const enterAction = normalizeEnterAction(preferences.articleEnterAction);
  const dateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const {
    data: articles,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(refreshArticleArchive, [retention], {
    failureToastOptions: {
      title: translations.archiveUpdateFailed,
      message: translations.checkConnection,
    },
  });
  const [article, setArticle] = useState<ArchivedArticle | null>();
  const hasOpenedBrowserArticle = useRef(false);
  const hasMarkedReaderArticle = useRef(false);

  useEffect(() => {
    if (!isLoading && articles && article === undefined) {
      setArticle(findNextUnreadArticle(articles, order) ?? null);
    }
  }, [article, articles, isLoading, order]);

  useEffect(() => {
    if (!article || enterAction !== "reader" || hasMarkedReaderArticle.current) {
      return;
    }

    hasMarkedReaderArticle.current = true;
    setArticle((currentArticle) => (currentArticle ? { ...currentArticle, isRead: true } : currentArticle));
    void setArticleReadStatus(article.id, true).catch(async (error: unknown) => {
      setArticle((currentArticle) => (currentArticle ? { ...currentArticle, isRead: false } : currentArticle));
      await showFailureToast(error, { title: translations.readStatusUpdateFailed });
    });
  }, [article, enterAction, translations.readStatusUpdateFailed]);

  useEffect(() => {
    if (!article || enterAction !== "browser" || hasOpenedBrowserArticle.current) {
      return;
    }

    hasOpenedBrowserArticle.current = true;
    void openArticleInBrowser(article);

    async function openArticleInBrowser(currentArticle: ArchivedArticle) {
      try {
        await setArticleReadStatus(currentArticle.id, true);
      } catch (error) {
        await showFailureToast(error, { title: translations.readStatusUpdateFailed });
      }

      try {
        await open(currentArticle.url);
        popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: translations.openInBrowser });
      }
    }
  }, [article, enterAction, translations.openInBrowser, translations.readStatusUpdateFailed]);

  async function updateReadStatus(isRead: boolean) {
    if (!article) {
      return;
    }

    const previousStatus = article.isRead;
    setArticle({ ...article, isRead });
    try {
      await setArticleReadStatus(article.id, isRead);
    } catch (error) {
      setArticle((currentArticle) => (currentArticle ? { ...currentArticle, isRead: previousStatus } : currentArticle));
      await showFailureToast(error, { title: translations.readStatusUpdateFailed });
    }
  }

  async function updateFavoriteStatus(isFavorite: boolean) {
    if (!article) {
      return;
    }

    const previousStatus = article.isFavorite;
    setArticle({ ...article, isFavorite });
    try {
      await setArticleFavoriteStatus(article, isFavorite);
    } catch (error) {
      setArticle((currentArticle) =>
        currentArticle ? { ...currentArticle, isFavorite: previousStatus } : currentArticle,
      );
      await showFailureToast(error, { title: translations.archiveUpdateFailed });
    }
  }

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (error && !articles) {
    return (
      <Detail
        markdown={`# ${translations.feedUnavailable}\n\n${translations.checkConnection}`}
        actions={
          <ActionPanel>
            <Action title={translations.reload} icon={Icon.RotateClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  if (article === undefined) {
    return <Detail isLoading />;
  }

  if (!article) {
    return (
      <Detail
        markdown={`# ${translations.noUnreadArticles}`}
        actions={
          <ActionPanel>
            <Action
              title={translations.allArticles}
              icon={Icon.List}
              onAction={() => launchCommand({ name: "all-articles", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      navigationTitle={article.title}
      markdown={createArticleDetailMarkdown(article, dateFormatter, translations)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={translations.openInBrowser} url={article.url} />
          <FindRelatedArticlesAction article={article} translations={translations} />
          <Action
            title={article.isRead ? translations.markUnread : translations.markRead}
            icon={article.isRead ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            onAction={() => updateReadStatus(!article.isRead)}
          />
          <Action
            title={article.isFavorite ? translations.removeReadLater : translations.saveForLater}
            icon={article.isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => updateFavoriteStatus(!article.isFavorite)}
          />
          <ArticleCopyActions article={article} translations={translations} />
        </ActionPanel>
      }
    />
  );
}

function normalizeOrder(value: string | undefined): NextUnreadArticleOrder {
  return value === "newest" ? "newest" : "oldest";
}

function normalizeEnterAction(value: string | undefined): ArticleEnterAction {
  return value === "browser" ? "browser" : "reader";
}
