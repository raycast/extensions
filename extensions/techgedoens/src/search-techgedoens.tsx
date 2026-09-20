import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  ArchivedArticle,
  readArticleArchive,
  setArticleFavoriteStatus,
  setArticleReadStatusForArticle,
} from "./article-archive";
import { createArticleDetailMarkdown } from "./article-detail";
import { Article, ARTICLES_PER_FEED_PAGE, fetchArticleSearchPage } from "./articles";
import { strings, translateCategory, type Strings } from "./strings";

type ArticleEnterAction = "browser" | "reader";
type ArticleCategoryFilter = "__all_categories__" | (typeof CATEGORY_OPTIONS)[number];

const MINIMUM_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 400;
const FILTER_ALL_CATEGORIES = "__all_categories__";
const CATEGORY_OPTIONS = [
  "Testberichte",
  "Software & Dienste",
  "Digital Lifehacks & Tipps",
  "Techgedöns Originals",
  "Aus dem WWW",
  "Virales & Unterhaltung",
  "Kurzmeldungen",
] as const;

export default function SearchTechgedoensCommand() {
  const preferences = getPreferenceValues<Preferences.SearchTechgedoens>();
  const translations = strings;
  const enterAction = preferences.articleEnterAction === "browser" ? "browser" : "reader";
  const detailDateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const listDateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategoryFilter>(FILTER_ALL_CATEGORIES);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [articles, setArticles] = useState<ArchivedArticle[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error>();
  const [refreshToken, setRefreshToken] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const query = searchText.trim();
    const currentRequestId = ++requestId.current;
    setError(undefined);
    setHasMore(false);
    setNextPage(2);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      setLoadedQuery("");
      setArticles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      void Promise.all([fetchArticleSearchPage(query, 1), readArticleArchive()])
        .then(([searchResults, storedArticles]) => {
          if (requestId.current !== currentRequestId) {
            return;
          }

          setLoadedQuery(query);
          setArticles(applyStoredStatuses(searchResults, storedArticles));
          setHasMore(searchResults.length === ARTICLES_PER_FEED_PAGE);
        })
        .catch((searchError: unknown) => {
          if (requestId.current === currentRequestId) {
            setArticles([]);
            setError(toError(searchError));
          }
        })
        .finally(() => {
          if (requestId.current === currentRequestId) {
            setIsLoading(false);
          }
        });
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [searchText, refreshToken]);

  async function loadMoreArticles() {
    if (!hasMore || isLoadingMore || !loadedQuery) {
      return;
    }

    const currentRequestId = requestId.current;
    const page = nextPage;
    setIsLoadingMore(true);

    try {
      const [searchResults, storedArticles] = await Promise.all([
        fetchArticleSearchPage(loadedQuery, page),
        readArticleArchive(),
      ]);
      if (requestId.current !== currentRequestId) {
        return;
      }

      const nextArticles = applyStoredStatuses(searchResults, storedArticles);
      setArticles((currentArticles) => mergeSearchResults(currentArticles, nextArticles));
      setNextPage(page + 1);
      setHasMore(searchResults.length === ARTICLES_PER_FEED_PAGE);
    } catch (searchError) {
      if (requestId.current === currentRequestId) {
        setHasMore(false);
        await showToast({
          style: Toast.Style.Failure,
          title: translations.feedUnavailable,
          message: toError(searchError).message,
        });
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setIsLoadingMore(false);
      }
    }
  }

  async function updateReadStatus(article: ArchivedArticle, isRead: boolean) {
    setArticles((currentArticles) =>
      currentArticles.map((currentArticle) =>
        currentArticle.id === article.id ? { ...currentArticle, isRead } : currentArticle,
      ),
    );
    await setArticleReadStatusForArticle(article, isRead);
  }

  async function updateFavoriteStatus(article: ArchivedArticle, isFavorite: boolean) {
    setArticles((currentArticles) =>
      currentArticles.map((currentArticle) =>
        currentArticle.id === article.id ? { ...currentArticle, isFavorite } : currentArticle,
      ),
    );
    await setArticleFavoriteStatus(article, isFavorite);
  }

  const trimmedSearchText = searchText.trim();
  const filteredArticles = articles.filter((article) => matchesArticleCategory(article, selectedCategory));
  const emptyTitle =
    trimmedSearchText.length < MINIMUM_SEARCH_LENGTH
      ? translations.searchBlogArchive
      : error
        ? translations.feedUnavailable
        : translations.noArticlesFound;
  const emptyDescription =
    trimmedSearchText.length < MINIMUM_SEARCH_LENGTH
      ? translations.searchNeedsTwoCharacters
      : error
        ? translations.checkConnection
        : translations.noSearchResults;

  return (
    <List
      filtering={false}
      isLoading={isLoading || isLoadingMore}
      navigationTitle={translations.searchBlogArchive}
      onSearchTextChange={setSearchText}
      pagination={{ hasMore, onLoadMore: loadMoreArticles, pageSize: ARTICLES_PER_FEED_PAGE }}
      searchBarPlaceholder={translations.searchBlogArchivePlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip={translations.filterArticles}
          value={selectedCategory}
          onChange={(category) => setSelectedCategory(category as ArticleCategoryFilter)}
        >
          <List.Dropdown.Item title={translations.allTopics} value={FILTER_ALL_CATEGORIES} />
          {CATEGORY_OPTIONS.map((category) => (
            <List.Dropdown.Item key={category} title={translateCategory(category)} value={category} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          {trimmedSearchText.length >= MINIMUM_SEARCH_LENGTH ? (
            <Action
              title={translations.reload}
              icon={Icon.RotateClockwise}
              onAction={() => setRefreshToken((v) => v + 1)}
            />
          ) : null}
          <Action title={translations.openSettings} icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    >
      {!isLoading && filteredArticles.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        filteredArticles.map((article) => (
          <SearchArticleItem
            key={article.id}
            article={article}
            detailDateFormatter={detailDateFormatter}
            enterAction={enterAction}
            listDateFormatter={listDateFormatter}
            onFavoriteStatusChange={updateFavoriteStatus}
            onReadStatusChange={updateReadStatus}
            translations={translations}
          />
        ))
      )}
    </List>
  );
}

function SearchArticleItem({
  article,
  detailDateFormatter,
  enterAction,
  listDateFormatter,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: ArchivedArticle;
  detailDateFormatter: Intl.DateTimeFormat;
  enterAction: ArticleEnterAction;
  listDateFormatter: Intl.DateTimeFormat;
  onFavoriteStatusChange: (article: ArchivedArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (article: ArchivedArticle, isRead: boolean) => Promise<void>;
  translations: Strings;
}) {
  const { push } = useNavigation();
  const primaryCategory = article.categories[0];
  const accessories: List.Item.Accessory[] = [
    { tag: { value: listDateFormatter.format(article.publishedAt), color: Color.SecondaryText } },
  ];

  if (primaryCategory) {
    accessories.push({ tag: { value: translateCategory(primaryCategory), color: "#2980b9" } });
  }

  async function showArticle() {
    if (!article.isRead) {
      await onReadStatusChange(article, true);
    }
    push(
      <SearchArticleDetail
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
      await onReadStatusChange(article, true);
    }
    await open(article.url);
  }

  return (
    <List.Item
      id={article.id}
      icon={
        article.imageUrl
          ? { source: article.imageUrl, fallback: "icon.png", mask: Image.Mask.RoundedRectangle }
          : "icon.png"
      }
      title={`${article.isFavorite ? "★ " : ""}${article.title}`}
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
              onAction={() => onReadStatusChange(article, !article.isRead)}
            />
            <Action
              title={article.isFavorite ? translations.removeReadLater : translations.saveForLater}
              icon={article.isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => onFavoriteStatusChange(article, !article.isFavorite)}
            />
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

function SearchArticleDetail({
  article,
  dateFormatter,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: ArchivedArticle;
  dateFormatter: Intl.DateTimeFormat;
  onFavoriteStatusChange: (article: ArchivedArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (article: ArchivedArticle, isRead: boolean) => Promise<void>;
  translations: Strings;
}) {
  return (
    <Detail
      navigationTitle={article.title}
      markdown={createArticleDetailMarkdown(article, dateFormatter, translations)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={translations.openInBrowser} url={article.url} />
          <Action
            title={article.isRead ? translations.markUnread : translations.markRead}
            icon={article.isRead ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            onAction={() => onReadStatusChange(article, !article.isRead)}
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

function applyStoredStatuses(articles: Article[], storedArticles: ArchivedArticle[]): ArchivedArticle[] {
  const storedArticleMap = new Map(storedArticles.map((article) => [article.id, article]));
  return articles.map((article) => {
    const storedArticle = storedArticleMap.get(article.id);
    return {
      ...article,
      isFavorite: storedArticle?.isFavorite ?? false,
      isRead: storedArticle?.isRead ?? false,
    };
  });
}

function mergeSearchResults(currentArticles: ArchivedArticle[], nextArticles: ArchivedArticle[]): ArchivedArticle[] {
  const mergedArticles = new Map(currentArticles.map((article) => [article.id, article]));
  for (const article of nextArticles) {
    if (!mergedArticles.has(article.id)) {
      mergedArticles.set(article.id, article);
    }
  }
  return [...mergedArticles.values()];
}

function matchesArticleCategory(article: ArchivedArticle, filter: ArticleCategoryFilter): boolean {
  if (filter === FILTER_ALL_CATEGORIES) {
    return true;
  }

  const filterLabel = translateCategory(filter);
  return article.categories.some((category) => translateCategory(category) === filterLabel);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
