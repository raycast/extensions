import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { showError } from "./errors";
import { handleSignedOut, isSignedOut, onSignedOut } from "./session";
import {
  backgroundRefreshEnabled,
  buildIndex,
  DriveIndex,
  IndexAbortedError,
  IndexBusyError,
  isIndexing,
  isStale,
  readIndex,
} from "./index";

/** Parsed once per command run and shared by every folder view pushed on the navigation stack. */
let shared: DriveIndex | undefined;
// Once signed out, the previous session's index must not stay in memory either.
onSignedOut(() => {
  shared = undefined;
});

/**
 * The optional whole-Drive search index: loads it, and builds or refreshes it on demand.
 * An interrupted first crawl is resumed automatically; otherwise crawling only happens
 * when the user asks, or when background refresh is enabled in preferences.
 */
export function useDriveIndex() {
  const [index, setIndexState] = useState<DriveIndex | undefined>(shared);
  const setIndex = useCallback((next: DriveIndex | undefined | ((current?: DriveIndex) => DriveIndex | undefined)) => {
    setIndexState((current) => {
      shared = typeof next === "function" ? next(current) : next;
      return shared;
    });
  }, []);
  const [progress, setProgress] = useState<string>();
  const refreshing = useRef(false);
  useEffect(() => onSignedOut(() => setIndexState(undefined)), []);

  const refresh = useCallback(
    async (silent: boolean) => {
      if (refreshing.current) return;
      if (await isIndexing()) {
        // The background command (or another window) is crawling: follow its checkpoints.
        setProgress("Indexing in the background…");
        return;
      }
      refreshing.current = true;
      const toast = silent
        ? undefined
        : await showToast({ style: Toast.Style.Animated, title: "Indexing Proton Drive…" });
      try {
        let shown = 0;
        const fresh = await buildIndex((done, left, partial) => {
          const text = `${done} folders listed · ${left} to go · ${partial.entries.length} items`;
          setProgress(text);
          if (toast) toast.message = text;
          // During the very first crawl, make results searchable as they come in.
          if (partial.entries.length - shown > 500) {
            shown = partial.entries.length;
            setIndex((current) =>
              !current || current.partial // Copies: the crawl keeps appending to these arrays.
                ? { ...partial, folders: partial.folders.slice(), entries: partial.entries.slice() }
                : current,
            );
          }
        });
        setIndex(fresh);
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = `Indexed ${fresh.entries.length} items`;
        }
      } catch (error) {
        await toast?.hide();
        if (error instanceof IndexBusyError) {
          // Another command won the lock in the meantime: follow its progress instead.
          refreshing.current = false;
          setProgress("Indexing in the background…");
          return;
        }
        if (isSignedOut(error)) await handleSignedOut();
        else if (!(error instanceof IndexAbortedError)) await showError(error, "Indexing failed");
      } finally {
        if (refreshing.current) {
          refreshing.current = false;
          setProgress(undefined);
        }
      }
    },
    [setIndex],
  );

  useEffect(() => {
    (async () => {
      const cached = shared ?? (await readIndex());
      setIndex(cached);
      if (cached?.partial || (backgroundRefreshEnabled() && isStale(cached))) await refresh(true);
    })();
  }, [refresh]);

  // While someone else is indexing, reload the index file as it gets checkpointed.
  useEffect(() => {
    if (refreshing.current || !progress) return;
    const timer = setInterval(async () => {
      if (!(await isIndexing())) setProgress(undefined);
      const latest = await readIndex();
      if (latest) setIndex(latest);
    }, 10_000);
    return () => clearInterval(timer);
  }, [progress]);

  return { index, progress, refresh };
}
