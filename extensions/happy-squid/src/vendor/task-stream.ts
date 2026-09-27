/** Ephemeral, account-private progress; completed replies remain in task snapshots. */
export const TASK_STREAM_EVENT = "review-progress";
export const TASK_STREAM_TOPIC_PREFIX = "task-review:";
export const MAX_TASK_STREAM_TEXT_LENGTH = 64_000;

export interface TaskStreamProgress {
  reviewId: string;
  sequence: number;
  text: string;
}

export function parseTaskStreamProgress(value: unknown): TaskStreamProgress | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (
    typeof message.reviewId !== "string" ||
    !message.reviewId ||
    message.reviewId.length > 128 ||
    typeof message.sequence !== "number" ||
    !Number.isSafeInteger(message.sequence) ||
    message.sequence < 1 ||
    typeof message.text !== "string" ||
    message.text.length > MAX_TASK_STREAM_TEXT_LENGTH
  )
    return null;
  return { reviewId: message.reviewId, sequence: message.sequence, text: message.text };
}
