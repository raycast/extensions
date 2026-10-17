import { catalogUrl } from "../config/catalog";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { InputApp } from "../model/input/input-models";
import { Application } from "../model/internal/internal-models";
import { ShortcutsParser } from "./input-parser";
import { getPlatform } from "./platform";
import useKeyCodes from "./key-codes-provider";
import type { FavoriteIdentifier } from "../user-data/favorites";
import type { Favorite, UserCustomizations } from "../user-data/models";
import { ShortcutMerger } from "../user-data/shortcut-merger";
import { useUserData } from "./user-data-provider";

interface UseAppShortcutsResult {
  isLoading: boolean;
  data: Application | undefined;
  favorites: Favorite[];
  toggleFavorite: (identifier: FavoriteIdentifier) => Promise<void>;
}

const emptyCustomizations: UserCustomizations = {
  customApps: [],
  customKeymaps: [],
  shortcuts: [],
  favorites: [],
};
const emptyFavorites: Favorite[] = [];

export function useAppShortcuts(slug: string | undefined, allowAuthorization = false): UseAppShortcutsResult {
  const platform = getPlatform();
  const keyCodesResult = useKeyCodes();
  const userData = useUserData(allowAuthorization);
  const isCustomApp = slug?.startsWith("custom-") ?? false;

  const { isLoading, data } = useFetch<InputApp>(catalogUrl(`data/${platform}/${slug}.json`), {
    execute: !!slug && !isCustomApp,
    failureToastOptions: {
      title: "Failed to load shortcuts",
    },
  });

  // Parse the input app with keyCodes
  // Done outside useFetch to avoid Map serialization issues
  const application = useMemo(() => {
    if (!slug) return undefined;
    if (!isCustomApp && (!data || !keyCodesResult.data)) return undefined;

    const baseApps =
      data && keyCodesResult.data ? new ShortcutsParser(keyCodesResult.data).parseInputShortcuts([data]) : [];
    const customizations = userData.data?.customizations ?? emptyCustomizations;
    return new ShortcutMerger(customizations).mergeShortcuts(baseApps, customizations).find((app) => app.slug === slug);
  }, [data, isCustomApp, keyCodesResult.data, slug, userData.data?.customizations]);

  return {
    isLoading: isLoading || userData.isLoading || (!isCustomApp && keyCodesResult.isLoading),
    data: application,
    favorites: userData.data?.favorites ?? emptyFavorites,
    toggleFavorite: userData.toggleFavorite,
  };
}
