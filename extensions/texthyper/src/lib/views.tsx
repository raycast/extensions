// Small pieces the list commands and the menu bar share.

import { Color, Icon, Image, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
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
// for the next sync to bring it back.
export function useLibrary(report: (error: unknown, title?: string) => void) {
  const [library, setLibrary] = useState<Library>();
  const [isLoading, setIsLoading] = useState(true);
  const latest = useRef<Library>(undefined);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      latest.current = await syncLibrary();
      setLibrary(latest.current);
    } catch (error) {
      if (error instanceof SignedOutError) {
        report(error, "Signed out");
      } else if (latest.current?.cursor) {
        showToast({ style: Toast.Style.Failure, title: "Showing your last synced library", message: String(error) });
      } else {
        report(error, "Could not load your library");
      }
    } finally {
      setIsLoading(false);
    }
  }, [report]);

  useEffect(() => {
    loadLibrary()
      .then((stored) => {
        if (!latest.current && stored.cursor > 0) {
          latest.current = stored;
          setLibrary(stored);
        }
      })
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  const update = useCallback(async (change: (library: Library) => Library) => {
    if (!latest.current) return;
    latest.current = change(latest.current);
    setLibrary(latest.current);
    await saveLibrary(latest.current);
  }, []);

  return { library, isLoading, refresh, update };
}
