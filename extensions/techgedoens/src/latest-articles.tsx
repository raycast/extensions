import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { createArticleDetailMarkdown } from "./article-detail";
import { Article, ARTICLE_COUNT } from "./articles";
import {
  ArchivedArticle,
  readArticleArchive,
  setArticleFavoriteStatus,
  setArticleReadStatusForArticle,
} from "./article-archive";
import { readCachedArticles, refreshArticleCache } from "./article-cache";
import { getTranslations, translateCategory, Translations } from "./i18n";

type LatestArticlePreferences = {
  articleEnterAction?: string;
  language?: string;
};

type ArticleEnterAction = "reader" | "browser";
type LatestArticle = Article & Pick<ArchivedArticle, "isFavorite" | "isRead">;

export default function LatestArticlesCommand() {
  const preferences = getPreferenceValues<LatestArticlePreferences>();
  const translations = getTranslations(preferences.language);
  const detailDateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const listDateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });
  const enterAction = normalizeArticleEnterAction(preferences.articleEnterAction);
  const {
    data: cachedArticles = [],
    error,
    isLoading: isLoadingArticles,
    revalidate: revalidateArticles,
  } = useCachedPromise(refreshArticleCache, [ARTICLE_COUNT], {
    initialData: readCachedArticles(ARTICLE_COUNT),
    failureToastOptions: {
      title: translations.noArticlesFound,
      message: translations.checkConnection,
    },
  });
  const {
    data: archivedArticles = [],
    isLoading: isLoadingArchive,
    mutate: mutateArchive,
    revalidate: revalidateArchive,
  } = useCachedPromise(readArticleArchive, []);
  const archivedArticlesById = new Map(archivedArticles.map((article) => [article.id, article]));
  const articles: LatestArticle[] = cachedArticles.map((article) => {
    const archivedArticle = archivedArticlesById.get(article.id);
    return {
      ...article,
      isFavorite: archivedArticle?.isFavorite ?? false,
      isRead: archivedArticle?.isRead ?? false,
    };
  });
  const isLoading = isLoadingArticles || isLoadingArchive;
  const loadError = error as Error | undefined;

  async function updateReadStatus(article: LatestArticle, isRead: boolean) {
    await mutateArchive(setArticleReadStatusForArticle(article, isRead), {
      optimisticUpdate: (currentArticles) => upsertArchivedArticle(currentArticles ?? [], article, { isRead }),
      shouldRevalidateAfter: false,
    });
  }

  async function updateFavoriteStatus(article: LatestArticle, isFavorite: boolean) {
    await mutateArchive(setArticleFavoriteStatus(article, isFavorite), {
      optimisticUpdate: (currentArticles) => upsertArchivedArticle(currentArticles ?? [], article, { isFavorite }),
      shouldRevalidateAfter: false,
    });
  }

  async function revalidate() {
    await Promise.all([revalidateArticles(), revalidateArchive()]);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={translations.latestArticles}
      searchBarPlaceholder={translations.searchArticles}
      actions={
        <ActionPanel>
          <Action title={translations.reload} icon={Icon.RotateClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    >
      {!isLoading && articles.length === 0 ? (
        <List.EmptyView
          icon={loadError ? Icon.ExclamationMark : Icon.Document}
          title={loadError ? translations.feedUnavailable : translations.noArticlesFound}
          description={loadError ? translations.checkConnection : translations.feedHasNoArticles}
        />
      ) : (
        articles.map((article, index) => (
          <ArticleListItem
            key={article.id}
            article={article}
            detailDateFormatter={detailDateFormatter}
            enterAction={enterAction}
            listDateFormatter={listDateFormatter}
            position={index + 1}
            revalidate={revalidate}
            onFavoriteStatusChange={updateFavoriteStatus}
            onReadStatusChange={updateReadStatus}
            translations={translations}
          />
        ))
      )}
    </List>
  );
}

function ArticleListItem({
  article,
  detailDateFormatter,
  enterAction,
  listDateFormatter,
  onFavoriteStatusChange,
  onReadStatusChange,
  position,
  revalidate,
  translations,
}: {
  article: LatestArticle;
  detailDateFormatter: Intl.DateTimeFormat;
  enterAction: ArticleEnterAction;
  listDateFormatter: Intl.DateTimeFormat;
  onFavoriteStatusChange: (article: LatestArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (article: LatestArticle, isRead: boolean) => Promise<void>;
  position: number;
  revalidate: () => Promise<void>;
  translations: Translations;
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
    accessories.push({
      tag: {
        value: translateCategory(primaryCategory, translations),
        color: "#2980b9",
      },
    });
  }

  async function showArticle() {
    if (!article.isRead) {
      await onReadStatusChange(article, true);
    }
    push(
      <ArticleDetail
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
      icon={getNumberIcon(position)}
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
            <Action title={translations.reloadArticle} icon={Icon.RotateClockwise} onAction={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function normalizeArticleEnterAction(value: string | undefined): ArticleEnterAction {
  return value === "browser" ? "browser" : "reader";
}

function getNumberIcon(position: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2980b9"/><text x="16" y="22" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="19" font-weight="650" fill="white">${position}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function ArticleDetail({
  article,
  dateFormatter,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: LatestArticle;
  dateFormatter: Intl.DateTimeFormat;
  onFavoriteStatusChange: (article: LatestArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (article: LatestArticle, isRead: boolean) => Promise<void>;
  translations: Translations;
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
            onAction={() => onReadStatusChange(article, false)}
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

function upsertArchivedArticle(
  currentArticles: ArchivedArticle[],
  article: LatestArticle,
  status: Partial<Pick<ArchivedArticle, "isFavorite" | "isRead">>,
): ArchivedArticle[] {
  const existingArticle = currentArticles.find((currentArticle) => currentArticle.id === article.id);
  const updatedArticle: ArchivedArticle = {
    ...article,
    isFavorite: existingArticle?.isFavorite ?? article.isFavorite,
    isRead: existingArticle?.isRead ?? article.isRead,
    ...status,
  };

  return existingArticle
    ? currentArticles.map((currentArticle) =>
        currentArticle.id === article.id ? { ...currentArticle, ...article, ...status } : currentArticle,
      )
    : [updatedArticle, ...currentArticles];
}
