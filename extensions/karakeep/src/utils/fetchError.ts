import { openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { isAuthError } from "./apiError";
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

    // Auth failures DO get a toast even though the views also render
    // AuthErrorView for them. The forms are why: createBookmark loads lists and
    // tags on mount and has no guarded view to fall back on, so staying silent
    // here would leave the user staring at two empty dropdowns with no
    // explanation until they tried to submit.
    if (isAuthError(error)) {
      showFailureToast(error, {
        title: t("connection.unauthorized"),
        primaryAction: { title: t("connection.openSettings"), onAction: openExtensionPreferences },
      });
      return;
    }

    showFailureToast(error, { title: t(`connection.loadFailed.${scope}`) });
  };
}

/**
 * Await a hook's `revalidate()` and throw if the refresh actually failed.
 *
 * `revalidate()` RESOLVES with the error instead of rejecting — @raycast/utils
 * routes a rejection through `handleError`, which normalizes the error and
 * `return`s it (dist/module.js). So `await revalidate()` in a refresh action
 * never throws, and `runWithToast` reports "Bookmarks refreshed" over a request
 * that came back 401. Anything that needs to know whether the refresh worked
 * has to inspect the resolved value.
 *
 * Typed `() => unknown` because the hook's own declaration lies: the paginated
 * variant declares `revalidate: () => void` (types.d.ts) while the runtime
 * `return`s the callback's promise (module.js). A `Promise<T>` parameter here
 * would not accept the very hooks this exists for. If some future version really
 * does return void, `await undefined` simply never throws — no worse than the
 * behaviour this replaces.
 */
export async function revalidated(revalidate: () => unknown): Promise<void> {
  const result = await revalidate();
  if (result instanceof Error) throw result;
}
