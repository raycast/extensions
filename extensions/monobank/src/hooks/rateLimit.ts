import { LocalStorage, Toast, showToast } from "@raycast/api";
import { RateLimitError } from "../api/monobank";
import { STATEMENT_RATE_LIMIT, STATEMENT_REQUEST_DELAY, STORAGE_KEYS } from "../data/constants";

/** A load was replaced by a newer one, or the view was closed, before it sent its request. */
export class CancelledError extends Error {}

/**
 * Sends `request` once monobank's rate limit allows it. On a 429, waits a full minute and retries once.
 * `label` starts the countdown toast, e.g. "Updating White *0002".
 */
export async function withRateLimit<T>(
  request: () => Promise<T>,
  isCurrent: () => boolean,
  onWait: (seconds: number) => void,
  label?: string,
): Promise<T> {
  // A load replaced right away (e.g. while switching accounts) is cancelled before it uses the rate limit.
  await sleep(STATEMENT_REQUEST_DELAY);
  if (!isCurrent()) throw new CancelledError();

  await waitForRateLimit(isCurrent, onWait, label);

  try {
    return await request();
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;

    // The limit was used elsewhere, e.g. by another app with the same token.
    await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
    await waitForRateLimit(isCurrent, onWait, label);
    return await request();
  }
}

export async function waitForRateLimit(isCurrent: () => boolean, onWait: (seconds: number) => void, label?: string) {
  const requestedAt = (await LocalStorage.getItem<number>(STORAGE_KEYS.statementRequestedAt)) ?? 0;
  // Capped, in case the stored time is in the future after a clock change.
  const remaining = Math.min(requestedAt + STATEMENT_RATE_LIMIT - Date.now(), STATEMENT_RATE_LIMIT);

  if (remaining > 0) {
    await countDown(Date.now() + remaining, isCurrent, onWait, label);
  }

  if (!isCurrent()) throw new CancelledError();
  await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
}

export async function countDown(
  until: number,
  isCurrent: () => boolean,
  onWait: (seconds: number) => void,
  label?: string,
) {
  const getTitle = (seconds: number) =>
    label
      ? `${label} · waiting for monobank's rate limit… ${seconds}s`
      : `Waiting for monobank's rate limit… ${seconds}s`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: getTitle(Math.ceil((until - Date.now()) / 1000)),
  });

  try {
    for (let remaining = until - Date.now(); remaining > 0; remaining = until - Date.now()) {
      if (!isCurrent()) throw new CancelledError();

      const seconds = Math.ceil(remaining / 1000);
      onWait(seconds);
      toast.title = getTitle(seconds);

      // Wake up when the displayed number of seconds changes.
      await sleep(remaining - (seconds - 1) * 1000);
    }
  } finally {
    await toast.hide();
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
