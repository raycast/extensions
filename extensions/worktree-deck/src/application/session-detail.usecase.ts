import { sessionDetailService, type SessionMessage } from "../domain/session-detail.service";

/**
 * セッション詳細の表示データを組み立てる
 */
function buildDisplay(args: { title: string; messages: SessionMessage[] }): {
  messages: SessionMessage[];
  emptyMessage: string | null;
} {
  const messages = sessionDetailService.filterDisplayMessages(args);
  if (!sessionDetailService.isReviewTitle(args.title)) {
    return { messages, emptyMessage: null };
  }
  if (messages.length === 0) {
    return { messages: [], emptyMessage: "No assistant messages yet." };
  }
  return { messages, emptyMessage: null };
}

/**
 * セッション詳細ユースケース関数群
 */
export const sessionDetailUsecase = {
  buildDisplay,
} as const;
