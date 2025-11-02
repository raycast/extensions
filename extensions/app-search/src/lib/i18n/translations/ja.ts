/**
 * Japanese translations
 */

import { I18nMessages } from "../types";

export const ja: I18nMessages = {
  // Search UI
  searchBarPlaceholder: "アプリを名前、用途、カテゴリーで検索...",
  emptyViewTitle: "アプリが見つかりません",
  emptyViewDescription: (query: string) => `"${query}"に一致するアプリケーションが見つかりませんでした`,

  // Section titles
  installedSectionTitle: (count: number) => `インストール済み (${count})`,
  installedSectionSubtitle: "Enterで起動",
  suggestionsSectionTitle: (count: number) => `提案 (${count})`,
  suggestionsSectionSubtitle: "未インストール - Enterで検索",
  askAISectionTitle: "より良い結果が必要ですか？",

  // List items
  askAITitle: "AIでスマート検索",
  askAISubtitle: "AIを使って用途や説明からアプリを検索",
  askAIAccessory: "Enterを押す",
  matchScoreTooltip: "マッチスコア",
  bundleIdTooltip: "バンドルID",

  // Actions
  launchApplication: "アプリケーションを起動",
  showInFinder: "Finderで表示",
  copyPath: "パスをコピー",
  copyBundleId: "バンドルIDをコピー",
  searchWithAI: "AIで検索",
  searchOnWeb: "Webで検索",
  visitOfficialWebsite: "公式サイトを開く",
  copyAppName: "アプリ名をコピー",

  // Match reasons
  matchReasonExact: "完全一致",
  matchReasonPrefix: "前方一致",
  matchReasonAI: "AI推薦",
  matchReasonCategory: "カテゴリ一致",
  matchReasonAISuggested: "AI提案",
  matchReasonContains: "部分一致",

  // Suggestions
  popularApp: (category: string) => `人気の${category}`,

  // Error messages
  searchFailed: "検索に失敗しました",
  searchFailedMessage: "アプリケーションの検索中にエラーが発生しました",
};
