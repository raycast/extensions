import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ArchivedArticle,
  normalizeArticleRetention,
  readArticleArchiveRevision,
  readArticleArchiveSnapshot,
  refreshArticleArchive,
  setArticleReadStatusForArticle,
} from "./article-archive";
import { strings, translateCategory } from "./strings";

const ARCHIVE_SYNC_INTERVAL = 5_000;
const PREFERENCES_SYNC_INTERVAL = 1_000;

export default function MenuBarArticlesCommand() {
  const preferences = useMenuBarPreferences();
  const translations = strings;
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const menuArticleCount = normalizeMenuArticleCount(preferences.menuBarDisplayArticleCount);
  const menuArticleTitleLength = normalizeMenuArticleTitleLength(preferences.menuBarDisplayTitleLength);
  const showOnlyUnreadArticles = preferences.menuBarDisplayUnreadOnly === true;
  const unreadCounterMode = preferences.menuBarDisplayUnreadCounter ?? "always";
  const showArticleDate = preferences.menuBarDisplayPublicationDate !== false;
  const showArticleCategory = preferences.menuBarDisplayCategory !== false;
  const [articles, setArticles] = useState<ArchivedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const archiveRevision = useRef<string | undefined>(undefined);
  const dateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });

  useEffect(() => {
    let cancelled = false;

    async function loadArticles() {
      try {
        const storedSnapshot = await readArticleArchiveSnapshot(retention);
        if (!cancelled) {
          archiveRevision.current = storedSnapshot.revision;
          setArticles(storedSnapshot.articles);
        }

        if (environment.launchType === LaunchType.Background || storedSnapshot.articles.length === 0) {
          await refreshArticleArchive(retention);
          const refreshedSnapshot = await readArticleArchiveSnapshot(retention);
          if (!cancelled) {
            archiveRevision.current = refreshedSnapshot.revision;
            setArticles(refreshedSnapshot.articles);
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
            const storedSnapshot = await readArticleArchiveSnapshot(retention);
            if (!cancelled) {
              archiveRevision.current = storedSnapshot.revision;
              setArticles(storedSnapshot.articles);
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
  }, [retention]);

  const sortedArticles = [...articles].sort(
    (first, second) => second.publishedAt.getTime() - first.publishedAt.getTime(),
  );
  const filteredArticles = showOnlyUnreadArticles
    ? sortedArticles.filter((article) => !article.isRead)
    : sortedArticles;
  const latestArticles = filteredArticles.slice(0, menuArticleCount);
  const favoriteArticles = filteredArticles.filter((article) => article.isFavorite).slice(0, menuArticleCount);
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
        const storedSnapshot = await readArticleArchiveSnapshot(retention);
        archiveRevision.current = storedSnapshot.revision;
        setArticles(storedSnapshot.articles);
      } catch (saveError) {
        setError(toError(saveError));
        try {
          const storedSnapshot = await readArticleArchiveSnapshot(retention);
          archiveRevision.current = storedSnapshot.revision;
          setArticles(storedSnapshot.articles);
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
      await refreshArticleArchive(retention);
      const storedSnapshot = await readArticleArchiveSnapshot(retention);
      archiveRevision.current = storedSnapshot.revision;
      setArticles(storedSnapshot.articles);
    } catch (reloadError) {
      setError(toError(reloadError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MenuBarExtra
      icon="icon.png"
      title={shouldShowUnreadCounter(unreadCounterMode, unreadCount) ? String(unreadCount) : undefined}
      tooltip={translations.unreadCount(unreadCount)}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={translations.latestArticles}>
        {latestArticles.length === 0 ? (
          <MenuBarExtra.Item
            title={
              error
                ? translations.feedUnavailable
                : showOnlyUnreadArticles
                  ? translations.noUnreadArticles
                  : translations.noArticlesFound
            }
          />
        ) : (
          latestArticles.map((article) => (
            <MenuArticleItem
              key={article.id}
              article={article}
              dateFormatter={dateFormatter}
              maximumTitleLength={menuArticleTitleLength}
              onOpen={openArticle}
              showArticleCategory={showArticleCategory}
              showArticleDate={showArticleDate}
              showFavoriteIndicator
            />
          ))
        )}
      </MenuBarExtra.Section>
      {favoriteArticles.length > 0 ? (
        <MenuBarExtra.Section title={translations.favorites}>
          {favoriteArticles.map((article) => (
            <MenuArticleItem
              key={article.id}
              article={article}
              dateFormatter={dateFormatter}
              maximumTitleLength={menuArticleTitleLength}
              onOpen={openArticle}
              showArticleCategory={showArticleCategory}
              showArticleDate={showArticleDate}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
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
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={translations.openSettings} icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function useMenuBarPreferences(): Preferences.MenuBarArticles {
  const [preferences, setPreferences] = useState(() => getPreferenceValues<Preferences.MenuBarArticles>());

  useEffect(() => {
    const interval = setInterval(() => {
      const latestPreferences = getPreferenceValues<Preferences.MenuBarArticles>();
      setPreferences((currentPreferences) =>
        haveSamePreferenceValues(currentPreferences, latestPreferences) ? currentPreferences : latestPreferences,
      );
    }, PREFERENCES_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return preferences;
}

function haveSamePreferenceValues(first: Preferences.MenuBarArticles, second: Preferences.MenuBarArticles): boolean {
  return (
    Object.keys(first).length === Object.keys(second).length &&
    Object.entries(first).every(([key, value]) => second[key as keyof Preferences.MenuBarArticles] === value)
  );
}

function MenuArticleItem({
  article,
  dateFormatter,
  maximumTitleLength,
  onOpen,
  showArticleCategory,
  showArticleDate,
  showFavoriteIndicator = false,
}: {
  article: ArchivedArticle;
  dateFormatter: Intl.DateTimeFormat;
  maximumTitleLength: number | undefined;
  onOpen: (article: ArchivedArticle) => Promise<void>;
  showArticleCategory: boolean;
  showArticleDate: boolean;
  showFavoriteIndicator?: boolean;
}) {
  const category = article.categories[0];
  const subtitle = [
    showArticleDate ? dateFormatter.format(article.publishedAt) : undefined,
    showArticleCategory && category ? translateCategory(category) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <MenuBarExtra.Item
      title={`${showFavoriteIndicator && article.isFavorite ? "★ " : ""}${truncateTitle(article.title, maximumTitleLength)}`}
      subtitle={subtitle || undefined}
      tooltip={article.title}
      icon={{
        source: article.isRead ? Icon.Circle : Icon.CircleFilled,
        tintColor: article.isRead ? Color.SecondaryText : Color.Blue,
      }}
      onAction={() => onOpen(article)}
    />
  );
}

function normalizeMenuArticleCount(value: string | undefined): 3 | 5 | 10 {
  if (value === "3") {
    return 3;
  }
  if (value === "10") {
    return 10;
  }
  return 5;
}

function normalizeMenuArticleTitleLength(value: string | undefined): 40 | 55 | 70 | 90 | undefined {
  if (value === "very-short") {
    return 40;
  }
  if (value === "short") {
    return 55;
  }
  if (value === "long") {
    return 90;
  }
  if (value === "full") {
    return undefined;
  }
  return 70;
}

function shouldShowUnreadCounter(
  mode: Preferences.MenuBarArticles["menuBarDisplayUnreadCounter"],
  unreadCount: number,
): boolean {
  return mode === "always" || (mode === "hide-zero" && unreadCount > 0);
}

function truncateTitle(title: string, maximumLength: number | undefined): string {
  if (maximumLength === undefined || title.length <= maximumLength) {
    return title;
  }

  const truncatedTitle = title.slice(0, maximumLength - 1).trimEnd();
  const lastWordBoundary = truncatedTitle.lastIndexOf(" ");
  const shortenedTitle =
    lastWordBoundary >= maximumLength * 0.7 ? truncatedTitle.slice(0, lastWordBoundary) : truncatedTitle;

  return `${shortenedTitle}…`;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
