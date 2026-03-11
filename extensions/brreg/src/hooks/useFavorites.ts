import { useState, useMemo, useRef, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import type { Image } from "@raycast/api";
import { showFailureToast } from "../utils/toast";
import { getFavicon, useLocalStorage } from "@raycast/utils";
import { Enhet } from "../types";
import { getCompanyDetails } from "../brreg-api";

export function useFavorites() {
  const {
    value: favorites,
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<Enhet[]>("favorites", []);

  const [showMoveIndicators, setShowMoveIndicators] = useState(false);

  // Ensure we always have a valid array, even if useLocalStorage returns undefined
  const favoritesList = Array.isArray(favorites) ? favorites : [];

  // Memoized derived state
  const favoriteIds = useMemo(() => new Set(favoritesList.map((f) => f.organisasjonsnummer)), [favoritesList]);

  const favoriteById = useMemo(() => {
    const map = new Map<string, Enhet>();
    for (const f of favoritesList) map.set(f.organisasjonsnummer, f);
    return map;
  }, [favoritesList]);

  // Favorites enrichment logic
  const isEnrichingRef = useRef(false);
  const enrichmentCacheRef = useRef(new Map<string, { website?: string; faviconUrl?: Image.ImageLike }>());
  useEffect(() => {
    if (isLoadingFavorites || favoritesList.length === 0 || isEnrichingRef.current) return;

    // Only consider favorites that need enrichment AND haven't been attempted yet
    const needsEnrichment = favoritesList.some(
      (f) => !f.faviconUrl && !enrichmentCacheRef.current.has(f.organisasjonsnummer),
    );
    if (!needsEnrichment) return;

    let cancelled = false;
    isEnrichingRef.current = true;

    async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
      const results = new Array<R>(items.length);
      let nextIndex = 0;

      const worker = async () => {
        while (true) {
          const current = nextIndex;
          nextIndex += 1;
          if (current >= items.length) return;
          results[current] = await mapper(items[current]);
        }
      };

      const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
      await Promise.all(workers);
      return results;
    }

    (async () => {
      const limit = 3;

      const updated = await mapWithConcurrency(favoritesList, limit, async (f) => {
        if (f.faviconUrl) return f;

        // Check if we've already attempted enrichment for this org number
        const cached = enrichmentCacheRef.current.get(f.organisasjonsnummer);
        if (cached !== undefined) {
          // Cache entry exists (attempted), use cached values even if undefined
          return { ...f, website: cached.website ?? f.website, faviconUrl: cached.faviconUrl ?? f.faviconUrl } as Enhet;
        }

        // Attempt enrichment and cache the result (even if website/favicon are undefined)
        try {
          const details = await getCompanyDetails(f.organisasjonsnummer);
          const website = details?.website || f.website;
          const faviconUrl = website ? getFavicon(website) : undefined;
          // Cache the attempt, storing undefined values to prevent re-attempts
          enrichmentCacheRef.current.set(f.organisasjonsnummer, { website, faviconUrl });
          return { ...f, website, faviconUrl } as Enhet;
        } catch {
          // Cache the failed attempt to prevent retry loops
          enrichmentCacheRef.current.set(f.organisasjonsnummer, { website: undefined, faviconUrl: undefined });
          return f;
        }
      });

      if (!cancelled) {
        // Only update if something actually changed
        const originalMap = new Map(favoritesList.map((f) => [f.organisasjonsnummer, f]));
        const hasChanges = updated.some((u) => {
          const original = originalMap.get(u.organisasjonsnummer);
          if (!original) return true; // New favorite
          return u.website !== original.website || u.faviconUrl !== original.faviconUrl;
        });
        if (hasChanges) {
          setFavorites(updated);
        }
      }
    })().finally(() => {
      isEnrichingRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [isLoadingFavorites, favoritesList, setFavorites]);

  // Favorites management functions
  const addFavorite = async (entity: Enhet) => {
    if (favoriteIds.has(entity.organisasjonsnummer)) return;

    // Use website already on the entity (e.g. from detail view) to avoid a redundant API fetch.
    // Fall back to fetching company details only when website is unknown.
    let website = entity.website;
    if (!website) {
      try {
        const details = await getCompanyDetails(entity.organisasjonsnummer);
        website = details?.website;
      } catch {
        // proceed without website
      }
    }

    const faviconUrl = website ? getFavicon(website) : undefined;
    const next = [{ ...entity, website, faviconUrl }, ...favoritesList];
    setFavorites(next);
    showToast({ style: Toast.Style.Success, title: "Added to Favorites", message: entity.navn });
  };

  const removeFavorite = (entity: Enhet) => {
    if (!favoriteIds.has(entity.organisasjonsnummer)) return;

    const next = favoritesList.filter((f) => f.organisasjonsnummer !== entity.organisasjonsnummer);
    setFavorites(next);
    showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: entity.navn });
  };

  const updateFavoriteEmoji = (entity: Enhet, emoji?: string) => {
    if (!favoriteIds.has(entity.organisasjonsnummer)) return;

    const next = favoritesList.map((f) =>
      f.organisasjonsnummer === entity.organisasjonsnummer ? { ...f, emoji: emoji || undefined } : f,
    );
    setFavorites(next);
    showToast({ style: Toast.Style.Success, title: emoji ? "Emoji Updated" : "Emoji Cleared", message: entity.navn });
  };

  const resetFavoriteToFavicon = (entity: Enhet) => {
    updateFavoriteEmoji(entity, undefined);
  };

  const refreshFavoriteFavicon = async (entity: Enhet) => {
    try {
      const details = await getCompanyDetails(entity.organisasjonsnummer);
      const website = details?.website || entity.website;
      const faviconUrl = website ? getFavicon(website) : undefined;
      const next = favoritesList.map((f) =>
        f.organisasjonsnummer === entity.organisasjonsnummer ? { ...f, website, faviconUrl } : f,
      );
      setFavorites(next);
      showToast({ style: Toast.Style.Success, title: "Favicon Refreshed", message: entity.navn });
    } catch {
      showFailureToast("Failed to refresh favicon");
    }
  };

  // Favorites reordering functions
  const moveFavorite = (entity: Enhet, direction: "up" | "down") => {
    if (!favoriteIds.has(entity.organisasjonsnummer)) return;

    const currentIndex = favoritesList.findIndex((f) => f.organisasjonsnummer === entity.organisasjonsnummer);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= favoritesList.length) return;

    const newList = [...favoritesList];
    const temp = newList[currentIndex];
    newList[currentIndex] = newList[newIndex];
    newList[newIndex] = temp;

    setFavorites(newList);
    showToast({ style: Toast.Style.Success, title: `Moved ${direction}`, message: entity.navn });
  };

  const moveFavoriteUp = (entity: Enhet) => moveFavorite(entity, "up");
  const moveFavoriteDown = (entity: Enhet) => moveFavorite(entity, "down");

  const toggleMoveMode = () => {
    const enabling = !showMoveIndicators;
    setShowMoveIndicators(enabling);
    showToast({
      style: Toast.Style.Success,
      title: enabling ? "Move mode enabled - Use ⌘⇧↑↓ to reorder favorites" : "Move mode disabled",
    });
  };

  return {
    // State
    favorites: favoritesList,
    favoriteIds,
    favoriteById,
    isLoadingFavorites,
    showMoveIndicators,

    // Actions
    addFavorite,
    removeFavorite,
    updateFavoriteEmoji,
    resetFavoriteToFavicon,
    refreshFavoriteFavicon,
    moveFavoriteUp,
    moveFavoriteDown,
    toggleMoveMode,

    // Utilities
    getFavoriteByOrgNumber: (orgNumber: string) => favoriteById.get(orgNumber),
  };
}
