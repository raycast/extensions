import { showFailureToast } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { isConnectionError } from "./connection";
import { getTranslator } from "../i18n/standalone";

const log = logger.child("[Fetch]");

/**
 * `onError` handler for useCachedPromise / usePromise.
 *
 * Supplying ANY onError suppresses Raycast's built-in "Failed to fetch latest
 * data / fetch failed" toast — the library runs `if (onError) onError(e) else
 * showFailureToast(...)`. That toast is wrong twice over for a stopped server:
 * it names a symptom rather than the cause, and it races the recovery screen
 * that is already explaining the same failure better.
 *
 * So for a connection failure we stay silent and let the view's recovery UI
 * own the message. Anything else (a 401, a 500) still deserves a toast, since
 * no recovery screen covers those.
 */
/** Scopes with a localized "couldn't load …" title. */
export type FetchScope = "bookmarks" | "lists" | "tags" | "highlights" | "backups" | "stats" | "search";

export function handleFetchError(scope: FetchScope) {
  return (error: Error) => {
    if (isConnectionError(error)) {
      // The view renders ConnectionErrorView for this; a toast on top would be
      // a second, worse explanation of the same problem.
      log.log(`${scope}: connection failure, deferring to recovery UI`);
      return;
    }
    log.error(`${scope}: request failed`, { message: error.message });
    const t = getTranslator();
    showFailureToast(error, { title: t(`connection.loadFailed.${scope}`) });
  };
}
