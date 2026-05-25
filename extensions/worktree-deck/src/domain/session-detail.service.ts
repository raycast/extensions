/**
 * セッションメッセージのロール
 */
export type SessionMessageRole = "user" | "assistant";

/**
 * セッション詳細表示用のメッセージ
 */
export type SessionMessage = {
  role: SessionMessageRole;
  text: string;
  timestamp: string | null;
};

/**
 * レビュー判定に使うタイトル先頭候補
 */
const REVIEW_TITLE_PREFIXES = ["Review ", "Review:", "レビュー"] as const;

/**
 * タイトルがレビュー用か判定する
 */
function isReviewTitle(title: string): boolean {
  const trimmed = title.trim();
  return REVIEW_TITLE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * 表示対象のメッセージを選別する
 */
function filterDisplayMessages(args: { title: string; messages: SessionMessage[] }): SessionMessage[] {
  if (!isReviewTitle(args.title)) {
    return args.messages;
  }
  return args.messages.filter((message) => message.role === "assistant");
}

/**
 * セッション詳細ドメインサービス関数群
 */
export const sessionDetailService = {
  isReviewTitle,
  filterDisplayMessages,
} as const;
