import { Toast, showToast } from "@raycast/api";
import { RateLimitError } from "../api/monobank";
import { STATEMENT_RATE_LIMIT, STATEMENT_REQUEST_DELAY } from "../data/constants";
import { releaseStatementSlot, reserveStatementSlot } from "../services/rateLimit";
import { sleep } from "../utils/common";

/** A load was replaced by a newer one, or the view was closed, before it sent its request. */
export class CancelledError extends Error {}

/**
 * Sends `request` once monobank's rate limit allows it, counting down in a toast while it waits. On a 429, waits a
 * full minute and retries once. `label` starts the countdown toast, e.g. "Updating White *0002".
 *
 * Its time is reserved with the other commands, the menu bar and the AI (see `reserveStatementSlot`), so loads that
 * start together queue a minute apart. A load cancelled while waiting gives its time back.
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

  try {
    return await sendInSlot(request, {}, isCurrent, onWait, label);
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;

    // The limit was used elsewhere, e.g. by another app with the same token.
    return await sendInSlot(request, { notBefore: Date.now() + STATEMENT_RATE_LIMIT }, isCurrent, onWait, label);
  }
}

async function sendInSlot<T>(
  request: () => Promise<T>,
  options: { notBefore?: number },
  isCurrent: () => boolean,
  onWait: (seconds: number) => void,
  label?: string,
): Promise<T> {
  const slot = await reserveStatementSlot(options);

  try {
    if (slot.at > Date.now()) await countDown(slot.at, isCurrent, onWait, label);
    if (!isCurrent()) throw new CancelledError();
  } catch (error) {
    if (error instanceof CancelledError) await releaseStatementSlot(slot);
    throw error;
  }

  return await request();
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
