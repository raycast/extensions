import { useState, useMemo, useRef, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
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
  const hasEnrichedRef = useRef(false);
  useEffect(() => {
    if (isLoadingFavorites || hasEnrichedRef.current || favoritesList.length === 0) return;

    const needsEnrichment = favoritesList.some((f) => !f.faviconUrl);
    if (!needsEnrichment) {
      hasEnrichedRef.current = true;
      return;
    }

    hasEnrichedRef.current = true;

    (async () => {
      const updated = await Promise.all(
        favoritesList.map(async (f) => {
          if (f.faviconUrl) return f;
          try {
            const details = await getCompanyDetails(f.organisasjonsnummer);
            const website = details?.website || f.website;
            const faviconUrl = website ? getFavicon(website) : undefined;
            return { ...f, website, faviconUrl } as Enhet;
          } catch {
            return f;
          }
        }),
      );
      setFavorites(updated);
    })();
  }, [isLoadingFavorites, favoritesList, setFavorites]);

  // Favorites management functions
  const addFavorite = async (entity: Enhet) => {
    if (favoriteIds.has(entity.organisasjonsnummer)) return;

    try {
      const details = await getCompanyDetails(entity.organisasjonsnummer);
      const website = details?.website;
      const faviconUrl = website ? getFavicon(website) : undefined;
      const next = [{ ...entity, website, faviconUrl }, ...favoritesList];
      setFavorites(next);
      showToast(Toast.Style.Success, "Added to Favorites", entity.navn);
    } catch {
      const nextFallback = [{ ...entity }, ...favoritesList];
      setFavorites(nextFallback);
      showToast(Toast.Style.Success, "Added to Favorites", entity.navn);
    }
  };

  const removeFavorite = (entity: Enhet) => {
    if (!favoriteIds.has(entity.organisasjonsnummer)) return;

    const next = favoritesList.filter((f) => f.organisasjonsnummer !== entity.organisasjonsnummer);
    setFavorites(next);
    showToast(Toast.Style.Success, "Removed from Favorites", entity.navn);
  };

  const updateFavoriteEmoji = (entity: Enhet, emoji?: string) => {
    if (!favoriteIds.has(entity.organisasjonsnummer)) return;

    const next = favoritesList.map((f) =>
      f.organisasjonsnummer === entity.organisasjonsnummer ? { ...f, emoji: emoji || undefined } : f,
    );
    setFavorites(next);
    showToast(Toast.Style.Success, emoji ? "Emoji Updated" : "Emoji Cleared", entity.navn);
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
      showToast(Toast.Style.Success, "Favicon Refreshed", entity.navn);
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
    showToast(Toast.Style.Success, `Moved ${direction}`, entity.navn);
  };

  const moveFavoriteUp = (entity: Enhet) => moveFavorite(entity, "up");
  const moveFavoriteDown = (entity: Enhet) => moveFavorite(entity, "down");

  const toggleMoveMode = () => {
    setShowMoveIndicators(!showMoveIndicators);
    showToast(
      Toast.Style.Success,
      showMoveIndicators ? "Move mode disabled" : "Move mode enabled - Use ⌘⇧↑↓ to reorder favorites",
    );
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
    hasFavorites: favoritesList.length > 0,
    getFavoriteByOrgNumber: (orgNumber: string) => favoriteById.get(orgNumber),
  };
}
