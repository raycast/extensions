/**
 * The Adopt scan.
 *
 * `useCachedPromise`, so reopening the command paints the previous answer at
 * once and refreshes underneath. The result is a statement about what is on
 * disk, so it cannot be served stale forever — but the revalidate is automatic
 * and the scan is quick, and a blank list for a second on every open is the
 * worse trade.
 */

import { useRef } from "react";
import { Toast, getApplications, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  brewLogger,
  isAbortError,
  isBrewLockError,
  loadAdoptIndex,
  loadCasksByToken,
  scanForAdoptableApps,
  showBrewFailureToast,
  type AdoptableApp,
} from "../utils";
import { loadIgnoredBundleIds } from "../utils/adoptIgnore";
import { brewFetchInstalled } from "../utils/brew/fetch";

export function useAdoptCandidates() {
  // `usePromise` populates this with the controller for the in-flight call and
  // aborts it on unmount or revalidate.
  const abortable = useRef<AbortController>(null);
  // Which run owns the progress toast — see the same guard in
  // `useDryRunPreview`. `usePromise` supersedes a run by aborting it and
  // starting the next one without waiting for the old to settle, and Raycast's
  // hide acts on whatever toast is visible rather than on ours.
  const toastRun = useRef(0);
  // Whether a list is already on screen — cached or from an earlier run —
  // which decides whether a scan announces itself with a toast.
  const hasData = useRef(false);

  const result = useCachedPromise(
    async (): Promise<AdoptableApp[]> => {
      // Claim the toast at ENTRY, before the first await. `usePromise` starts a
      // superseding run without waiting for this one to settle, so if the
      // generation were only taken after `loadAdoptIndex`, an older run that
      // rejected while this one was still awaiting would still think it owned
      // the toast — and a hide acts on whatever toast is visible.
      const mine = ++toastRun.current;

      // BEFORE any toast. The index throws rather than coming back empty when
      // it is missing or damaged, and that is not a scan in progress — showing
      // "Looking for adoptable apps…" over a screen that says the index has to
      // be rebuilt describes work that is not happening.
      const index = await loadAdoptIndex();

      // Only now is there a scan to report — and only when nothing is on
      // screen yet. A first open is seconds of silence otherwise. A RESCAN with
      // a list already showing has the list's own loading bar, and a toast here
      // would take Raycast's single toast slot from whatever the user just did:
      // after an adoption it would replace the "Adopted" toast the instant it
      // appeared, then hide, so the adoption would look like it said nothing.
      const clearProgress = (toast: Toast | undefined) => {
        if (!toast || toastRun.current !== mine) return; // none, or superseded — not ours
        toast.hide().catch((hideErr) => brewLogger.log("Failed to hide adopt progress toast", hideErr));
      };

      const progress = hasData.current
        ? undefined
        : await showToast({ style: Toast.Style.Animated, title: "Looking for adoptable apps…" });
      try {
        const [apps, installed] = await Promise.all([
          getApplications(),
          brewFetchInstalled(true, abortable.current?.signal),
        ]);

        const scanned = await scanForAdoptableApps({
          apps,
          index,
          installedCasks: new Set(installed?.casks.keys() ?? []),
          ignoredBundleIds: new Set(),
          loadCasks: (tokens) => loadCasksByToken(tokens),
        });

        // The ignore list is read LAST, after the slow part, and applied here —
        // not handed to the scan at the start. An ignore the user makes while
        // this scan is running writes the cache optimistically, and this
        // result then lands on top of it via `onData`: read at the start, it
        // would carry the old list and put the ignored app back, direct Adopt
        // action and all. That shrinks the window from the whole scan to the
        // latency of the ignore's own LocalStorage write: a scan finishing in
        // the few milliseconds after the keystroke can still read the old list.
        // Accepted — the row reappears, and adopting it still takes a
        // confirmation.
        const ignoredBundleIds = await loadIgnoredBundleIds();
        const found = scanned.map((app) => ({
          ...app,
          ignored: Boolean(app.bundleId && ignoredBundleIds.has(app.bundleId)),
        }));

        brewLogger.log("Adopt scan complete", {
          apps: apps.length,
          adoptable: found.length,
          ignored: ignoredBundleIds.size,
          // Whether this scan took the toast slot. A rescan after an adoption
          // must not, or it replaces the "Adopted" toast — the log says which.
          announced: progress !== undefined,
        });
        clearProgress(progress);
        return found;
      } catch (err) {
        // An unmount or a superseded revalidate aborts the run, and an abort
        // raises no toast of its own — `showBrewFailureToast` returns early on
        // one and `usePromise` suppresses `onError` for it — so this toast must
        // clear itself. A real failure is left alone: `onError` puts a failure
        // toast up, and hiding here would dismiss that instead.
        if (isAbortError(err)) clearProgress(progress);
        throw err;
      }
    },
    [],
    {
      abortable,
      keepPreviousData: true,
      onError: async (error) => {
        brewLogger.error("Adopt scan failed", {
          errorType: error.name,
          message: error.message,
          isLockError: isBrewLockError(error),
        });
        // An unavailable index is rendered as its own view with a Rebuild
        // action, so a toast would only duplicate it.
        if (error.name === "AdoptIndexUnavailableError") return;
        await showBrewFailureToast("Could Not Scan for Apps", error, {
          retryAction: async () => {
            result.revalidate();
          },
        });
      },
    },
  );

  hasData.current = result.data !== undefined;
  return result;
}
