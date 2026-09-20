import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  LocalStorage,
  open,
  openCommandPreferences,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createArticleDetailMarkdown } from "./article-detail";
import {
  ArchivedArticle,
  normalizeArticleRetention,
  refreshArticleArchive,
  setAllArticlesReadStatus,
  setArticleFavoriteStatus,
  setArticleReadStatus,
} from "./article-archive";
import { strings, translateCategory, type Strings } from "./strings";

type ArticleEnterAction = "reader" | "browser";
type ArticleStatusFilter = "__all_statuses__" | "__favorites__" | "__read__" | "__unread__";
type ArticleCategoryFilter = "__all_categories__" | (typeof CATEGORY_OPTIONS)[number];
type InitialStatusPreference = "all" | "last" | "read" | "unread";

const FILTER_ALL_STATUSES = "__all_statuses__";
const FILTER_FAVORITES = "__favorites__";
const FILTER_READ = "__read__";
const FILTER_UNREAD = "__unread__";
const FILTER_ALL_CATEGORIES = "__all_categories__";
const LAST_STATUS_FILTER_KEY = "all-articles-last-status-filter-v1";
const DEFAULT_ARCHIVE_PAGE_SIZE = 30;
const CATEGORY_OPTIONS = [
  "Testberichte",
  "Software & Dienste",
  "Digital Lifehacks & Tipps",
  "Techgedöns Originals",
  "Aus dem WWW",
  "Virales & Unterhaltung",
  "Kurzmeldungen",
] as const;

export default function AllArticlesCommand() {
  const preferences = getPreferenceValues<Preferences.AllArticles>();
  const translations = strings;
  const detailDateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const listDateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });
  const initialStatusPreference = normalizeInitialStatusPreference(preferences.allArticlesInitialFilter);
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const pageSize = normalizeArchivePageSize(preferences.archivePageSize);
  const enterAction = normalizeArticleEnterAction(preferences.articleEnterAction);
  const [selectedStatus, setSelectedStatus] = useState<ArticleStatusFilter>(() =>
    initialStatusPreferenceToFilter(initialStatusPreference),
  );
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategoryFilter>(FILTER_ALL_CATEGORIES);
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const {
    data: archiveData,
    error,
    isLoading,
    mutate,
    revalidate,
  } = useCachedPromise(refreshArticleArchive, [retention], {
    failureToastOptions: {
      title: translations.archiveUpdateFailed,
      message: translations.checkConnection,
    },
  });
  const { data: lastStatusFilter } = useCachedPromise(readLastStatusFilter, []);
  const articles = archiveData ?? [];

  useEffect(() => {
    if (initialStatusPreference === "last" && lastStatusFilter) {
      setSelectedStatus(lastStatusFilter);
    }
  }, [initialStatusPreference, lastStatusFilter]);

  useEffect(() => {
    if (initialStatusPreference !== "last") {
      void LocalStorage.setItem(LAST_STATUS_FILTER_KEY, initialStatusPreferenceToFilter(initialStatusPreference));
    }
  }, [initialStatusPreference]);

  useEffect(() => {
    if (!archiveData) {
      return;
    }

    const unreadArticleCount = archiveData.filter((article) => !article.isRead).length;
    void updateCommandMetadata({ subtitle: translations.unreadCount(unreadArticleCount) });
  }, [archiveData, translations]);

  const filteredArticles = articles.filter(
    (article) =>
      matchesArticleStatus(article, selectedStatus) &&
      matchesArticleCategory(article, selectedCategory) &&
      matchesArchiveSearch(article, searchText),
  );
  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleArticles.length < filteredArticles.length;

  async function updateReadStatus(articleId: string, isRead: boolean) {
    await mutate(setArticleReadStatus(articleId, isRead), {
      optimisticUpdate: (currentArticles) =>
        (currentArticles ?? []).map((article) => (article.id === articleId ? { ...article, isRead } : article)),
      shouldRevalidateAfter: false,
    });
  }

  async function updateFavoriteStatus(article: ArchivedArticle, isFavorite: boolean) {
    await mutate(setArticleFavoriteStatus(article, isFavorite), {
      optimisticUpdate: (currentArticles) =>
        (currentArticles ?? []).map((currentArticle) =>
          currentArticle.id === article.id ? { ...currentArticle, isFavorite } : currentArticle,
        ),
      shouldRevalidateAfter: false,
    });
  }

  async function markAllArticlesAsRead() {
    const confirmed = await confirmAlert({
      icon: Icon.Eye,
      title: translations.markAllReadTitle,
      message: translations.markAllReadMessage,
      primaryAction: { title: translations.yes },
      dismissAction: { title: translations.no },
    });

    if (!confirmed) {
      return;
    }

    await mutate(setAllArticlesReadStatus(true), {
      optimisticUpdate: (currentArticles) => (currentArticles ?? []).map((article) => ({ ...article, isRead: true })),
      shouldRevalidateAfter: false,
    });
  }

  function resetVisibleArticles() {
    setVisibleCount(pageSize);
  }

  function handleFilterChange(filter: string) {
    resetVisibleArticles();

    if (isArticleStatusFilter(filter)) {
      setSelectedStatus(filter);
      void LocalStorage.setItem(LAST_STATUS_FILTER_KEY, filter);
      return;
    }

    setSelectedCategory(filter as ArticleCategoryFilter);
  }

  function handleSearchTextChange(value: string) {
    resetVisibleArticles();
    setSearchText(value);
  }

  function loadMoreArticles() {
    setVisibleCount((currentCount) => Math.min(currentCount + pageSize, filteredArticles.length));
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      navigationTitle={articleStatusTitle(selectedStatus, translations)}
      onSearchTextChange={handleSearchTextChange}
      pagination={{ hasMore, onLoadMore: loadMoreArticles, pageSize }}
      searchBarPlaceholder={translations.searchArticles}
      searchBarAccessory={
        <List.Dropdown tooltip={translations.filterArticles} value={selectedCategory} onChange={handleFilterChange}>
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title={statusFilterTitle(translations.allArticles, FILTER_ALL_STATUSES, selectedStatus)}
              value={FILTER_ALL_STATUSES}
              icon={Icon.List}
            />
            <List.Dropdown.Item
              title={statusFilterTitle(translations.unread, FILTER_UNREAD, selectedStatus)}
              value={FILTER_UNREAD}
              icon={Icon.Circle}
            />
            <List.Dropdown.Item
              title={statusFilterTitle(translations.read, FILTER_READ, selectedStatus)}
              value={FILTER_READ}
              icon={Icon.CheckCircle}
            />
            <List.Dropdown.Item
              title={statusFilterTitle(translations.favoritesReadLater, FILTER_FAVORITES, selectedStatus)}
              value={FILTER_FAVORITES}
              icon={Icon.Star}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item title={translations.allTopics} value={FILTER_ALL_CATEGORIES} />
            {CATEGORY_OPTIONS.map((category) => (
              <List.Dropdown.Item key={category} title={translateCategory(category)} value={category} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title={translations.reload} icon={Icon.RotateClockwise} onAction={revalidate} />
          <Action title={translations.openSettings} icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      {!isLoading && filteredArticles.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.Document}
          title={error ? translations.feedUnavailable : translations.noArticlesFound}
          description={
            error
              ? translations.checkConnection
              : selectedStatus === FILTER_UNREAD
                ? translations.noUnreadArticles
                : translations.noStoredArticlesForSelection
          }
        />
      ) : (
        visibleArticles.map((article) => (
          <ArchiveArticleItem
            key={article.id}
            article={article}
            enterAction={enterAction}
            detailDateFormatter={detailDateFormatter}
            listDateFormatter={listDateFormatter}
            onMarkAllAsRead={markAllArticlesAsRead}
            onFavoriteStatusChange={updateFavoriteStatus}
            onReadStatusChange={updateReadStatus}
            translations={translations}
          />
        ))
      )}
    </List>
  );
}

function matchesArticleStatus(article: ArchivedArticle, filter: ArticleStatusFilter): boolean {
  if (filter === FILTER_UNREAD) {
    return !article.isRead;
  }
  if (filter === FILTER_READ) {
    return article.isRead;
  }
  if (filter === FILTER_FAVORITES) {
    return article.isFavorite;
  }
  return filter === FILTER_ALL_STATUSES;
}

function matchesArticleCategory(article: ArchivedArticle, filter: ArticleCategoryFilter): boolean {
  if (filter === FILTER_ALL_CATEGORIES) {
    return true;
  }

  const filterLabel = translateCategory(filter);
  return article.categories.some((category) => translateCategory(category) === filterLabel);
}

function isArticleStatusFilter(filter: string): filter is ArticleStatusFilter {
  return [FILTER_ALL_STATUSES, FILTER_FAVORITES, FILTER_READ, FILTER_UNREAD].includes(filter as ArticleStatusFilter);
}

function initialStatusPreferenceToFilter(preference: InitialStatusPreference): ArticleStatusFilter {
  if (preference === "read") {
    return FILTER_READ;
  }
  if (preference === "unread") {
    return FILTER_UNREAD;
  }
  return FILTER_ALL_STATUSES;
}

function normalizeInitialStatusPreference(value: string | undefined): InitialStatusPreference {
  return value === "last" || value === "read" || value === "unread" ? value : "all";
}

async function readLastStatusFilter(): Promise<ArticleStatusFilter> {
  const storedFilter = await LocalStorage.getItem<string>(LAST_STATUS_FILTER_KEY);
  return storedFilter && isArticleStatusFilter(storedFilter) ? storedFilter : FILTER_ALL_STATUSES;
}

function articleStatusTitle(status: ArticleStatusFilter, translations: Strings): string {
  if (status === FILTER_READ) {
    return translations.read;
  }
  if (status === FILTER_UNREAD) {
    return translations.unread;
  }
  if (status === FILTER_FAVORITES) {
    return translations.favorites;
  }
  return translations.allArticles;
}

function statusFilterTitle(title: string, filter: ArticleStatusFilter, selectedStatus: ArticleStatusFilter): string {
  return filter === selectedStatus ? `✓ ${title}` : title;
}

function normalizeArchivePageSize(value: string | undefined): number {
  const pageSize = Number.parseInt(value ?? "", 10);
  return Number.isInteger(pageSize) && pageSize >= 15 && pageSize <= 90 ? pageSize : DEFAULT_ARCHIVE_PAGE_SIZE;
}

function normalizeArticleEnterAction(value: string | undefined): ArticleEnterAction {
  return value === "browser" ? "browser" : "reader";
}

function matchesArchiveSearch(article: ArchivedArticle, searchText: string): boolean {
  const searchTerms = normalizeSearchValue(searchText).split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) {
    return true;
  }

  const searchableText = normalizeSearchValue(
    [article.title, article.categories.join(" "), article.excerpt, article.contentMarkdown].filter(Boolean).join(" "),
  );
  return searchTerms.every((searchTerm) => searchableText.includes(searchTerm));
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE");
}

function ArchiveArticleItem({
  article,
  detailDateFormatter,
  enterAction,
  listDateFormatter,
  onMarkAllAsRead,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: ArchivedArticle;
  detailDateFormatter: Intl.DateTimeFormat;
  enterAction: ArticleEnterAction;
  listDateFormatter: Intl.DateTimeFormat;
  onMarkAllAsRead: () => Promise<void>;
  onFavoriteStatusChange: (article: ArchivedArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (articleId: string, isRead: boolean) => Promise<void>;
  translations: Strings;
}) {
  const { push } = useNavigation();
  const primaryCategory = article.categories[0];
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: listDateFormatter.format(article.publishedAt),
        color: Color.SecondaryText,
      },
    },
  ];

  if (primaryCategory) {
    accessories.push({ tag: { value: translateCategory(primaryCategory), color: "#2980b9" } });
  }

  async function showArticle() {
    if (!article.isRead) {
      await onReadStatusChange(article.id, true);
    }
    push(
      <ArchiveArticleDetail
        article={{ ...article, isRead: true }}
        dateFormatter={detailDateFormatter}
        onFavoriteStatusChange={onFavoriteStatusChange}
        onReadStatusChange={onReadStatusChange}
        translations={translations}
      />,
    );
  }

  async function openInBrowser() {
    if (!article.isRead) {
      await onReadStatusChange(article.id, true);
    }
    await open(article.url);
  }

  return (
    <List.Item
      id={article.id}
      icon={
        article.imageUrl
          ? {
              source: article.imageUrl,
              fallback: "icon.png",
              mask: Image.Mask.RoundedRectangle,
            }
          : "icon.png"
      }
      title={`${article.isFavorite ? "★" : article.isRead ? "○" : "●"} ${article.title}`}
      keywords={article.categories}
      accessories={accessories}
      actions={
        <ActionPanel title={article.title}>
          <ActionPanel.Section>
            {enterAction === "browser" ? (
              <Action title={translations.openInBrowser} icon={Icon.Globe} onAction={openInBrowser} />
            ) : (
              <Action title={translations.showArticle} icon={Icon.Document} onAction={showArticle} />
            )}
            {enterAction === "browser" ? (
              <Action title={translations.showArticle} icon={Icon.Document} onAction={showArticle} />
            ) : (
              <Action title={translations.openInBrowser} icon={Icon.Globe} onAction={openInBrowser} />
            )}
            <Action
              title={article.isRead ? translations.markUnread : translations.markRead}
              icon={article.isRead ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "u" },
                Windows: { modifiers: ["ctrl", "shift"], key: "u" },
              }}
              onAction={() => onReadStatusChange(article.id, !article.isRead)}
            />
            <Action
              title={article.isFavorite ? translations.removeReadLater : translations.saveForLater}
              icon={article.isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => onFavoriteStatusChange(article, !article.isFavorite)}
            />
            <Action title={translations.markAllRead} icon={Icon.CheckCircle} onAction={onMarkAllAsRead} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenWith title={translations.openWith} path={article.url} />
            <Action.CopyToClipboard
              title={translations.copyArticleLink}
              content={article.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action title={translations.openSettings} icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ArchiveArticleDetail({
  article,
  dateFormatter,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: ArchivedArticle;
  dateFormatter: Intl.DateTimeFormat;
  onFavoriteStatusChange: (article: ArchivedArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (articleId: string, isRead: boolean) => Promise<void>;
  translations: Strings;
}) {
  const markdown = createArticleDetailMarkdown(article, dateFormatter, translations);

  return (
    <Detail
      navigationTitle={article.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={translations.openInBrowser} url={article.url} />
          <Action
            title={translations.markUnread}
            icon={Icon.EyeDisabled}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            onAction={() => onReadStatusChange(article.id, false)}
          />
          <Action
            title={article.isFavorite ? translations.removeReadLater : translations.saveForLater}
            icon={article.isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => onFavoriteStatusChange(article, !article.isFavorite)}
          />
          <Action.CopyToClipboard
            title={translations.copyArticleLink}
            content={article.url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
