import { catalogUrl } from "../config/catalog";
import { useFetch } from "@raycast/utils";
import { AppsResponse, AppMetadata } from "../model/input/input-models";
import { getPlatform } from "./platform";
import type { FavoriteIdentifier } from "../user-data/favorites";
import type { Favorite, UserCustomizations } from "../user-data/models";
import { mergeAppMetadata } from "../user-data/view-models";
import { useUserData } from "./user-data-provider";

const emptyApps: AppMetadata[] = [];
const emptyFavorites: Favorite[] = [];

interface UseAppsResult {
  isLoading: boolean;
  accountError?: string;
  data: AppMetadata[];
  customizations?: UserCustomizations;
  favorites: Favorite[];
  toggleFavorite: (identifier: FavoriteIdentifier) => Promise<void>;
}

export function useApps(allowAuthorization = false): UseAppsResult {
  const platform = getPlatform();
  const userData = useUserData(allowAuthorization);

  const { isLoading, data } = useFetch<AppsResponse>(catalogUrl(`data/${platform}/apps.json`), {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Failed to load applications",
    },
  });

  return {
    isLoading: isLoading || userData.isLoading,
    accountError: userData.error,
    data: mergeAppMetadata(data?.apps ?? emptyApps, userData.data?.customizations, platform),
    customizations: userData.data?.customizations,
    favorites: userData.data?.favorites ?? emptyFavorites,
    toggleFavorite: userData.toggleFavorite,
  };
}
