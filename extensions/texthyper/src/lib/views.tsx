// Small pieces the list commands and the menu bar share.

import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { getFavicon, showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { SignedOutError } from "./api";
import { loadLibrary, saveLibrary, syncLibrary } from "./library";
import type { Article, HighlightColor, Library } from "./types";

// The site's icon as Texthyper archived it, else the live one.
export function articleIcon(article: Pick<Article, "favicon_url" | "url">): Image.ImageLike {
  if (article.favicon_url)
    return { source: article.favicon_url, fallback: Icon.Document, mask: Image.Mask.RoundedRectangle };
  return getFavicon(article.url, { fallback: Icon.Document, mask: Image.Mask.RoundedRectangle });
}

export const HIGHLIGHT_COLORS: Record<HighlightColor, { name: string; color: Color }> = {
  yellow: { name: "Yellow", color: Color.Yellow },
  green: { name: "Green", color: Color.Green },
  blue: { name: "Blue", color: Color.Blue },
  pink: { name: "Pink", color: Color.Magenta },
  purple: { name: "Purple", color: Color.Purple },
};

// The library from disk at once, then again after a sync. `update` applies
// a change made here (a note edited, a highlight deleted) without waiting
// for the next sync to bring it back. A failed refresh keeps what is already
// showing, because the hook drops its data when the request fails.
export function useLibrary(report: (error: unknown, title?: string) => void) {
  const [kept, setKept] = useState<Library>();
  const [, setRevision] = useState(0);
  // The copy edits build on. Updated as each edit finishes, so a second edit
  // that was already in flight still sees the first one.
  const latest = useRef<Library>(undefined);
  const baseSeen = useRef<Library>(undefined);
  const writes = useRef(Promise.resolve());

  const stored = usePromise(loadLibrary, [], {
    onError(error) {
      if (error instanceof SignedOutError) report(error, "Signed out");
      else report(error, "Could not load your library");
    },
  });

  const {
    data: synced,
    isLoading: syncing,
    error: syncError,
    revalidate,
  } = usePromise(syncLibrary, [], {
    execute: stored.data !== undefined,
    onData: setKept,
    onError(error) {
      const hasLibrary = (stored.data?.cursor ?? 0) > 0 || (kept?.cursor ?? 0) > 0;
      if (error instanceof SignedOutError) report(error, "Signed out");
      else if (hasLibrary) showFailureToast(error, { title: "Showing your last synced library" });
      else report(error, "Could not load your library");
    },
  });

  const cached = stored.data && stored.data.cursor > 0 ? stored.data : undefined;
  // A new sync replaces local edits. The same object, kept after a failed
  // refresh, does not.
  const base = synced ?? kept ?? cached;
  if (base !== baseSeen.current) {
    baseSeen.current = base;
    latest.current = base;
  }
  const library = latest.current;

  const update = useCallback(async (change: (library: Library) => Library) => {
    const current = latest.current;
    if (!current) return;
    const next = change(current);
    latest.current = next;
    setRevision((revision) => revision + 1);
    const write = writes.current.then(() => saveLibrary(next));
    writes.current = write.then(
      () => undefined,
      () => undefined,
    );
    await write;
  }, []);

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  return {
    library,
    isLoading: stored.isLoading || syncing,
    error: syncError ?? (library ? undefined : stored.error),
    refresh,
    update,
  };
}

// What a list shows when loading failed and there is nothing to show
// instead: the reason, and a way to try again.
export function LoadFailed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      title="Could not load from Texthyper"
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
