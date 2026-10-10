import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ArchivedArticle,
  normalizeArticleRetention,
  readArticleArchive,
  readArticleArchiveRevision,
  refreshArticleArchive,
  setArticleReadStatusForArticle,
} from "./article-archive";
import { strings, translateCategory } from "./strings";

const MENU_ARTICLE_COUNT = 5;
const MAX_MENU_ARTICLE_TITLE_LENGTH = 70;
const ARCHIVE_SYNC_INTERVAL = 5_000;

export default function MenuBarArticlesCommand() {
  const preferences = getPreferenceValues<Preferences.MenuBarArticles>();
  const translations = strings;
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const showArticleDate = preferences.showMenuBarArticleDate !== false;
  const showArticleCategory = preferences.showMenuBarArticleCategory !== false;
  const [articles, setArticles] = useState<ArchivedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const archiveRevision = useRef<string | undefined>(undefined);
  const dateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      try {
        const storedArticles = await readArticleArchive();
        archiveRevision.current = await readArticleArchiveRevision();
        if (!cancelled) {
          setArticles(storedArticles);
        }

        if (environment.launchType === LaunchType.Background || storedArticles.length === 0) {
          const refreshedArticles = await refreshArticleArchive(retention);
          archiveRevision.current = await readArticleArchiveRevision();
          if (!cancelled) {
            setArticles(refreshedArticles);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(toError(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadArticles();
    return () => {
      cancelled = true;
    };
  }, [retention]);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      void readArticleArchiveRevision()
        .then(async (latestRevision) => {
          if (latestRevision && latestRevision !== archiveRevision.current) {
            const storedArticles = await readArticleArchive();
            if (!cancelled) {
              archiveRevision.current = latestRevision;
              setArticles(storedArticles);
            }
          }
        })
        .catch((syncError) => {
          if (!cancelled) {
            setError(toError(syncError));
          }
        });
    }, ARCHIVE_SYNC_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const sortedArticles = [...articles].sort(
    (first, second) => second.publishedAt.getTime() - first.publishedAt.getTime(),
  );
  const latestArticles = sortedArticles.slice(0, MENU_ARTICLE_COUNT);
  const unreadCount = articles.filter((article) => !article.isRead).length;

  async function openArticle(article: ArchivedArticle) {
    if (!article.isRead) {
      setArticles((currentArticles) =>
        currentArticles.map((currentArticle) =>
          currentArticle.id === article.id ? { ...currentArticle, isRead: true } : currentArticle,
        ),
      );
      try {
        await setArticleReadStatusForArticle(article, true);
        archiveRevision.current = await readArticleArchiveRevision();
      } catch (saveError) {
        setError(toError(saveError));
        try {
          setArticles(await readArticleArchive());
          archiveRevision.current = await readArticleArchiveRevision();
        } catch {
          setArticles((currentArticles) =>
            currentArticles.map((currentArticle) =>
              currentArticle.id === article.id ? { ...currentArticle, isRead: false } : currentArticle,
            ),
          );
        }
        await showToast({
          style: Toast.Style.Failure,
          title: translations.readStatusUpdateFailed,
          message: toError(saveError).message,
        });
      }
    }
    await open(article.url);
  }

  async function reloadArticles() {
    setIsLoading(true);
    setError(undefined);

    try {
      setArticles(await refreshArticleArchive(retention));
      archiveRevision.current = await readArticleArchiveRevision();
    } catch (reloadError) {
      setError(toError(reloadError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MenuBarExtra
      icon="icon.png"
      title={String(unreadCount)}
      tooltip={translations.unreadCount(unreadCount)}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={translations.latestArticles}>
        {latestArticles.length === 0 ? (
          <MenuBarExtra.Item title={error ? translations.feedUnavailable : translations.noArticlesFound} />
        ) : (
          latestArticles.map((article) => {
            const category = article.categories[0];
            const subtitle = [
              showArticleDate ? dateFormatter.format(article.publishedAt) : undefined,
              showArticleCategory && category ? translateCategory(category) : undefined,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <MenuBarExtra.Item
                key={article.id}
                title={`${article.isFavorite ? "★ " : ""}${truncateTitle(article.title)}`}
                subtitle={subtitle || undefined}
                tooltip={article.title}
                icon={{
                  source: article.isRead ? Icon.Circle : Icon.CircleFilled,
                  tintColor: article.isRead ? Color.SecondaryText : Color.Blue,
                }}
                onAction={() => openArticle(article)}
              />
            );
          })
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={translations.latestArticles}
          icon={Icon.List}
          onAction={() => launchCommand({ name: "latest-articles", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={translations.allArticles}
          icon={Icon.List}
          onAction={() => launchCommand({ name: "all-articles", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={translations.favorites}
          icon={Icon.Star}
          onAction={() => launchCommand({ name: "saved-articles", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title={translations.reload} icon={Icon.RotateClockwise} onAction={reloadArticles} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function truncateTitle(title: string): string {
  if (title.length <= MAX_MENU_ARTICLE_TITLE_LENGTH) {
    return title;
  }

  const truncatedTitle = title.slice(0, MAX_MENU_ARTICLE_TITLE_LENGTH - 1).trimEnd();
  const lastWordBoundary = truncatedTitle.lastIndexOf(" ");
  const shortenedTitle =
    lastWordBoundary >= MAX_MENU_ARTICLE_TITLE_LENGTH * 0.7
      ? truncatedTitle.slice(0, lastWordBoundary)
      : truncatedTitle;

  return `${shortenedTitle}…`;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
