import { sessionDetailService, type SessionMessage } from "../domain/session-detail.service";
import { sessionDetailUsecase } from "../application/session-detail.usecase";

/**
 * セッション詳細に表示するメッセージを選別する
 */
export function filterSessionMessagesForDisplay(args: { title: string; messages: SessionMessage[] }): SessionMessage[] {
  return sessionDetailService.filterDisplayMessages(args);
}

/**
 * セッション詳細の表示データを組み立てる
 */
export function buildSessionDetailDisplay(args: { title: string; messages: SessionMessage[] }): {
  messages: SessionMessage[];
  emptyMessage: string | null;
} {
  return sessionDetailUsecase.buildDisplay(args);
}
