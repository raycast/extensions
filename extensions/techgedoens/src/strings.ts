export type Strings = {
  locale: string;
  latestArticles: string;
  allArticles: string;
  unread: string;
  read: string;
  favorites: string;
  readLater: string;
  favoritesReadLater: string;
  searchArticles: string;
  searchBlogArchive: string;
  searchBlogArchiveDescription: string;
  searchBlogArchivePlaceholder: string;
  searchNeedsTwoCharacters: string;
  noSearchResults: string;
  searchFavorites: string;
  filterArticles: string;
  allTopics: string;
  reload: string;
  reloadArticle: string;
  openSettings: string;
  feedUnavailable: string;
  noArticlesFound: string;
  feedHasNoArticles: string;
  archiveUpdateFailed: string;
  checkConnection: string;
  noUnreadArticles: string;
  noStoredArticlesForSelection: string;
  markAllReadTitle: string;
  markAllReadMessage: string;
  yes: string;
  no: string;
  openInBrowser: string;
  showArticle: string;
  markUnread: string;
  markRead: string;
  removeReadLater: string;
  saveForLater: string;
  markAllRead: string;
  openWith: string;
  copyArticleLink: string;
  copyArticleMarkdownLink: string;
  copyArticleTitleAndUrl: string;
  copyArticleTitleSummaryAndUrl: string;
  noTextAvailable: string;
  noSavedArticles: string;
  saveArticleForLaterDescription: string;
  published: string;
  noNewArticles: string;
  archiveIncomplete: string;
  updateFailed: string;
  unreadCount: (count: number) => string;
  newArticles: (count: number) => string;
  checkedArticles: (count: number) => string;
  updatedAt: (time: string) => string;
};

export const strings: Strings = {
  locale: "en-US",
  latestArticles: "Latest Articles",
  allArticles: "All Articles",
  unread: "Unread",
  read: "Read",
  favorites: "Favorites",
  readLater: "Read Later",
  favoritesReadLater: "Favorites / Read Later",
  searchArticles: "Search articles…",
  searchBlogArchive: "Search Techgedöns",
  searchBlogArchiveDescription: "Search all published articles in the Techgedöns.de blog archive.",
  searchBlogArchivePlaceholder: "Search the blog archive…",
  searchNeedsTwoCharacters: "Enter at least two characters to search the complete blog archive.",
  noSearchResults: "No articles match this search.",
  searchFavorites: "Search favorites…",
  filterArticles: "Filter articles",
  allTopics: "All Topics",
  reload: "Reload",
  reloadArticle: "Reload Article",
  openSettings: "Open Settings",
  feedUnavailable: "Feed Unavailable",
  noArticlesFound: "No Articles Found",
  feedHasNoArticles: "The Techgedoens.de feed currently contains no articles.",
  archiveUpdateFailed: "Could Not Update Article Archive",
  checkConnection: "Check your internet connection and try again.",
  noUnreadArticles: "There are no unread articles.",
  noStoredArticlesForSelection: "There are no stored articles for this selection.",
  markAllReadTitle: "Mark All Articles as Read?",
  markAllReadMessage: "This marks every stored article as read.",
  yes: "Yes",
  no: "No",
  openInBrowser: "Open in Default Browser",
  showArticle: "Show Article",
  markUnread: "Mark as Unread",
  markRead: "Mark as Read",
  removeReadLater: "Remove from Read Later",
  saveForLater: "Save for Later",
  markAllRead: "Mark All as Read",
  openWith: "Open Article With…",
  copyArticleLink: "Copy Article Link",
  copyArticleMarkdownLink: "Copy as Markdown Link",
  copyArticleTitleAndUrl: "Copy Title and URL",
  copyArticleTitleSummaryAndUrl: "Copy Title, Summary, and URL",
  noTextAvailable: "No text is available for this article.",
  noSavedArticles: "No Saved Articles",
  saveArticleForLaterDescription: "Save an article for later from its action menu.",
  published: "Published",
  noNewArticles: "No new articles",
  archiveIncomplete: "Archive incomplete - safety limit reached",
  updateFailed: "Update failed",
  unreadCount: (count) => (count === 1 ? "1 unread article" : `${count} unread articles`),
  newArticles: (count) => (count === 1 ? "1 new article" : `${count} new articles`),
  checkedArticles: (count) => (count === 1 ? "1 recent article checked" : `${count} recent articles checked`),
  updatedAt: (time) => `Updated ${time}`,
};

export const CATEGORY_OPTIONS = [
  "Tests & Eindrücke",
  "Software & Dienste",
  "Digitale Lifehacks",
  "Techgedöns Originals",
  "Webfundstücke",
  "Netzkultur & Virales",
  "Kurzmeldungen",
] as const;

const categoryLabels: Record<string, string> = {
  Testberichte: "Tests & Eindrücke",
  "Ausgepackt & Ausprobiert | Testberichte": "Tests & Eindrücke",
  "Tests & Eindrücke": "Tests & Eindrücke",
  "Software & Dienste": "Software & Dienste",
  "Software, Web-Apps & Dienste": "Software & Dienste",
  "Apps & Dienste": "Software & Dienste",
  "Digital Lifehacks & Tipps": "Digitale Lifehacks",
  "Digital Lifehacks, Tipps & Erklärbär 1x1": "Digitale Lifehacks",
  "Digital Lifehacks": "Digitale Lifehacks",
  "Digitale Lifehacks": "Digitale Lifehacks",
  "Techgedöns Originals": "Techgedöns Originals",
  "Aus dem WWW": "Webfundstücke",
  "Sehens- und lesenswertes aus dem WWW": "Webfundstücke",
  Webfundstücke: "Webfundstücke",
  "Virales & Unterhaltung": "Netzkultur & Virales",
  "Ein ♥ für virale Unterhaltung": "Netzkultur & Virales",
  "Netzkultur & Virales": "Netzkultur & Virales",
  Kurzmeldungen: "Kurzmeldungen",
  "Kurzmeldungen & Pressebox": "Kurzmeldungen",
};

export function translateCategory(category: string): string {
  return categoryLabels[category] ?? category;
}
