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
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { createArticleDetailMarkdown } from "./article-detail";
import { ArticleCopyActions } from "./article-copy-actions";
import {
  ArchivedArticle,
  readArticleArchive,
  setArticleFavoriteStatus,
  setArticleReadStatusForArticle,
} from "./article-archive";
import { searchRelevantArticles } from "./article-search";
import { Article } from "./articles";
import { createRelatedArticleSearchText, findRelatedArticles } from "./related-article-ranking";
import { translateCategory, type Strings } from "./strings";

const LIVE_RELATED_CANDIDATE_LIMIT = 45;
const LIVE_RELATED_SEARCH_OPTIONS = { maxPages: 1, maxQueries: 3 } as const;
type ArticleEnterAction = "browser" | "reader";

export function FindRelatedArticlesAction({ article, translations }: { article: Article; translations: Strings }) {
  return (
    <Action.Push
      title={translations.findRelatedArticles}
      icon={Icon.MagnifyingGlass}
      target={<RelatedArticles sourceArticle={article} translations={translations} />}
    />
  );
}

function RelatedArticles({ sourceArticle, translations }: { sourceArticle: Article; translations: Strings }) {
  const preferences = getPreferenceValues<Preferences>();
  const enterAction: ArticleEnterAction = preferences.articleEnterAction === "browser" ? "browser" : "reader";
  const dateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });
  const detailDateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const {
    data: relatedArticles = [],
    error,
    isLoading,
    mutate,
    revalidate,
  } = useCachedPromise(loadRelatedArticles, [sourceArticle], {
    failureToastOptions: {
      title: translations.feedUnavailable,
      message: translations.checkConnection,
    },
  });

  async function updateReadStatus(article: ArchivedArticle, isRead: boolean) {
    await mutate(setArticleReadStatusForArticle(article, isRead), {
      optimisticUpdate: (currentArticles) =>
        (currentArticles ?? []).map((currentArticle) =>
          currentArticle.id === article.id ? { ...currentArticle, isRead } : currentArticle,
        ),
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

  return (
    <List
      isLoading={isLoading}
      navigationTitle={translations.relatedArticles}
      searchBarPlaceholder={translations.searchRelatedArticles}
    >
      {!isLoading && relatedArticles.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
          title={error ? translations.feedUnavailable : translations.noRelatedArticles}
          description={error ? translations.checkConnection : translations.noRelatedArticlesDescription}
          actions={
            <ActionPanel>
              <Action title={translations.reload} icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        relatedArticles.map((article) => (
          <RelatedArticleItem
            key={article.id}
            article={article}
            dateFormatter={dateFormatter}
            detailDateFormatter={detailDateFormatter}
            enterAction={enterAction}
            onFavoriteStatusChange={updateFavoriteStatus}
            onReadStatusChange={updateReadStatus}
            translations={translations}
          />
        ))
      )}
    </List>
  );
}

async function loadRelatedArticles(sourceArticle: Article): Promise<ArchivedArticle[]> {
  const [liveArticles, storedArticles] = await Promise.all([
    searchRelevantArticles(
      createRelatedArticleSearchText(sourceArticle),
      LIVE_RELATED_CANDIDATE_LIMIT,
      LIVE_RELATED_SEARCH_OPTIONS,
    ),
    readArticleArchive(),
  ]);
  const storedArticlesById = new Map(storedArticles.map((article) => [article.id, article]));
  const candidates: ArchivedArticle[] = liveArticles.map((article) => {
    const storedArticle = storedArticlesById.get(article.id);
    return {
      ...article,
      isFavorite: storedArticle?.isFavorite ?? false,
      isRead: storedArticle?.isRead ?? false,
    };
  });

  return findRelatedArticles(sourceArticle, candidates);
}

function RelatedArticleItem({
  article,
  dateFormatter,
  detailDateFormatter,
  enterAction,
  onFavoriteStatusChange,
  onReadStatusChange,
  translations,
}: {
  article: ArchivedArticle;
  dateFormatter: Intl.DateTimeFormat;
  detailDateFormatter: Intl.DateTimeFormat;
  enterAction: ArticleEnterAction;
  onFavoriteStatusChange: (article: ArchivedArticle, isFavorite: boolean) => Promise<void>;
  onReadStatusChange: (article: ArchivedArticle, isRead: boolean) => Promise<void>;
  translations: Strings;
}) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [
    { tag: { value: dateFormatter.format(article.publishedAt), color: Color.SecondaryText } },
  ];
  const primaryCategory = article.categories[0];

  if (primaryCategory) {
    accessories.push({ tag: { value: translateCategory(primaryCategory), color: "#2980b9" } });
  }

  async function showArticle() {
    if (!article.isRead) {
      await onReadStatusChange(article, true);
    }
    push(
      <RelatedArticleDetail
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
      title={`${article.isFavorite ? "★" : article.isRead ? "○" : "●"} ${article.title}`}
      keywords={article.categories}
      accessories={accessories}
      actions={
        <ActionPanel title={article.title}>
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
          <ArticleCopyActions article={article} translations={translations} />
        </ActionPanel>
      }
    />
  );
}

function RelatedArticleDetail({
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
  const [currentArticle, setCurrentArticle] = useState(article);
  const statusUpdatePending = useRef(false);
  const confirmedReadStatus = useRef(article.isRead);
  const confirmedFavoriteStatus = useRef(article.isFavorite);

  async function updateReadStatus(isRead: boolean) {
    if (statusUpdatePending.current) return;

    statusUpdatePending.current = true;
    setCurrentArticle((latestArticle) => ({ ...latestArticle, isRead }));

    try {
      await onReadStatusChange(currentArticle, isRead);
      confirmedReadStatus.current = isRead;
    } catch (error) {
      setCurrentArticle((latestArticle) => ({ ...latestArticle, isRead: confirmedReadStatus.current }));
      await showFailureToast(error, { title: translations.readStatusUpdateFailed });
    } finally {
      statusUpdatePending.current = false;
    }
  }

  async function updateFavoriteStatus(isFavorite: boolean) {
    if (statusUpdatePending.current) return;

    statusUpdatePending.current = true;
    setCurrentArticle((latestArticle) => ({ ...latestArticle, isFavorite }));

    try {
      await onFavoriteStatusChange(currentArticle, isFavorite);
      confirmedFavoriteStatus.current = isFavorite;
    } catch (error) {
      setCurrentArticle((latestArticle) => ({ ...latestArticle, isFavorite: confirmedFavoriteStatus.current }));
      await showFailureToast(error, { title: translations.archiveUpdateFailed });
    } finally {
      statusUpdatePending.current = false;
    }
  }

  return (
    <Detail
      navigationTitle={currentArticle.title}
      markdown={createArticleDetailMarkdown(currentArticle, dateFormatter, translations)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={translations.openInBrowser} url={currentArticle.url} />
          <FindRelatedArticlesAction article={currentArticle} translations={translations} />
          <Action
            title={currentArticle.isRead ? translations.markUnread : translations.markRead}
            icon={currentArticle.isRead ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            onAction={() => updateReadStatus(!currentArticle.isRead)}
          />
          <Action
            title={currentArticle.isFavorite ? translations.removeReadLater : translations.saveForLater}
            icon={currentArticle.isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => updateFavoriteStatus(!currentArticle.isFavorite)}
          />
          <ArticleCopyActions article={currentArticle} translations={translations} />
        </ActionPanel>
      }
    />
  );
}
