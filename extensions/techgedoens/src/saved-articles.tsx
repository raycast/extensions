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
import { useCachedPromise } from "@raycast/utils";
import { createArticleDetailMarkdown } from "./article-detail";
import {
  ArchivedArticle,
  normalizeArticleRetention,
  refreshArticleArchive,
  setArticleFavoriteStatus,
  setArticleReadStatus,
} from "./article-archive";
import { getTranslations, translateCategory, Translations } from "./i18n";

type SavedArticlePreferences = {
  archiveRetention?: string;
  articleEnterAction?: string;
  language?: string;
};

type ArticleEnterAction = "reader" | "browser";

export default function SavedArticlesCommand() {
  const preferences = getPreferenceValues<SavedArticlePreferences>();
  const translations = getTranslations(preferences.language);
  const listDateFormatter = new Intl.DateTimeFormat(translations.locale, { dateStyle: "medium" });
  const detailDateFormatter = new Intl.DateTimeFormat(translations.locale, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const retention = normalizeArticleRetention(preferences.archiveRetention);
  const enterAction = preferences.articleEnterAction === "browser" ? "browser" : "reader";
  const { data: articles = [], isLoading, mutate, revalidate } = useCachedPromise(refreshArticleArchive, [retention]);
  const favoriteArticles = articles.filter((article) => article.isFavorite);

  async function updateReadStatus(articleId: string, isRead: boolean) {
    await mutate(setArticleReadStatus(articleId, isRead), {
      optimisticUpdate: (currentArticles) =>
        (currentArticles ?? []).map((article) => (article.id === articleId ? { ...article, isRead } : article)),
      shouldRevalidateAfter: false,
    });
  }

  async function removeFavorite(article: ArchivedArticle) {
    await mutate(setArticleFavoriteStatus(article, false), {
      optimisticUpdate: (currentArticles) =>
        (currentArticles ?? []).map((currentArticle) =>
          currentArticle.id === article.id ? { ...currentArticle, isFavorite: false } : currentArticle,
        ),
      shouldRevalidateAfter: false,
    });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={translations.readLater}
      searchBarPlaceholder={translations.searchFavorites}
    >
      {!isLoading && favoriteArticles.length === 0 ? (
        <List.EmptyView
          icon={Icon.Star}
          title={translations.noSavedArticles}
          description={translations.saveArticleForLaterDescription}
          actions={
            <ActionPanel>
              <Action title={translations.reload} icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        favoriteArticles.map((article) => (
          <SavedArticleItem
            key={article.id}
            article={article}
            detailDateFormatter={detailDateFormatter}
            enterAction={enterAction}
            listDateFormatter={listDateFormatter}
            onReadStatusChange={updateReadStatus}
            onRemoveFavorite={removeFavorite}
            translations={translations}
          />
        ))
      )}
    </List>
  );
}

function SavedArticleItem({
  article,
  detailDateFormatter,
  enterAction,
  listDateFormatter,
  onReadStatusChange,
  onRemoveFavorite,
  translations,
}: {
  article: ArchivedArticle;
  detailDateFormatter: Intl.DateTimeFormat;
  enterAction: ArticleEnterAction;
  listDateFormatter: Intl.DateTimeFormat;
  onReadStatusChange: (articleId: string, isRead: boolean) => Promise<void>;
  onRemoveFavorite: (article: ArchivedArticle) => Promise<void>;
  translations: Translations;
}) {
  const { push } = useNavigation();
  const accessories: List.Item.Accessory[] = [
    { tag: { value: listDateFormatter.format(article.publishedAt), color: Color.SecondaryText } },
  ];
  const primaryCategory = article.categories[0];
  if (primaryCategory) {
    accessories.push({ tag: { value: translateCategory(primaryCategory, translations), color: "#2980b9" } });
  }

  async function showArticle() {
    if (!article.isRead) {
      await onReadStatusChange(article.id, true);
    }
    push(
      <SavedArticleDetail
        article={{ ...article, isRead: true }}
        dateFormatter={detailDateFormatter}
        onRemoveFavorite={onRemoveFavorite}
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
            onAction={() => onReadStatusChange(article.id, !article.isRead)}
          />
          <Action
            title={translations.removeReadLater}
            icon={Icon.StarDisabled}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onRemoveFavorite(article)}
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

function SavedArticleDetail({
  article,
  dateFormatter,
  onRemoveFavorite,
  translations,
}: {
  article: ArchivedArticle;
  dateFormatter: Intl.DateTimeFormat;
  onRemoveFavorite: (article: ArchivedArticle) => Promise<void>;
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
            title={translations.removeReadLater}
            icon={Icon.StarDisabled}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onRemoveFavorite(article)}
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
