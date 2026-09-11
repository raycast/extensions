import { useState, useEffect } from "react";
import { List, showToast, Toast, openExtensionPreferences, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { client } from "./api/client";
import { ConfigurationRequired, InitialSyncRequired, NoTranslationsFound } from "./components/empty-states";
import { TranslationListItem } from "./components/translation-list-item";
import { TranslationDetail } from "./components/translation-detail";
import { FilterSortDropdown, type SortOption } from "./components/filter-sort-dropdown";
import { useSync } from "./hooks/use-sync";

const SHOWING_DETAIL_KEY = "view-translations-showing-detail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");

  const [dropdownSelection, setDropdownSelection] = useState<string | undefined>();
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<boolean>(SHOWING_DETAIL_KEY).then((value) => {
      if (value !== undefined) {
        setShowingDetail(value);
      }
    });
  }, []);

  const handleToggleDetail = (value: boolean) => {
    setShowingDetail(value);
    LocalStorage.setItem(SHOWING_DETAIL_KEY, value);
  };

  const [needsSync, setNeedsSync] = useState(false);
  const { isSyncing, handleSync } = useSync();

  useEffect(() => {
    client.needsInitialSync().then(setNeedsSync);
  }, []);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (platforms: string[], searchQuery: string, sort: SortOption) => {
      const needsInitialSync = await client.needsInitialSync();
      if (needsInitialSync) {
        return [];
      }

      return await client.listKeysFromDatabase({
        platforms: platforms.length > 0 ? platforms : undefined,
        searchQuery: searchQuery || undefined,
        searchInTranslations: true,
        sortBy: sort,
      });
    },
    [selectedPlatforms, searchText, sortBy],
    {
      initialData: [],
      onError: async (error: unknown) => {
        if (
          error instanceof Error &&
          (error.message.includes("not configured") || error.message.includes("API token"))
        ) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing Configuration",
            message: "Please set your API token and project ID in preferences",
          });
          openExtensionPreferences();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to fetch translations",
          });
        }
      },
    },
  );

  const filteredKeys = data || [];

  const onSyncSuccess = () => {
    setNeedsSync(false);
    revalidate();
  };

  if (
    error &&
    error instanceof Error &&
    (error.message.includes("not configured") || error.message.includes("API token"))
  ) {
    return <ConfigurationRequired onOpenPreferences={openExtensionPreferences} />;
  }

  if (needsSync && !isSyncing) {
    return (
      <InitialSyncRequired onSync={() => handleSync(onSyncSuccess)} onOpenPreferences={openExtensionPreferences} />
    );
  }

  const handleDropdownChange = (value: string) => {
    setDropdownSelection(value);
    const [type, ...rest] = value.split("-");
    const action = rest.join("-");

    if (type === "filter") {
      if (action === "all") {
        setSelectedPlatforms([]);
      } else {
        // Toggle the platform
        setSelectedPlatforms((prev) => {
          if (prev.includes(action)) {
            return prev.filter((p) => p !== action);
          } else {
            return [...prev, action];
          }
        });
      }
    } else if (type === "sort") {
      setSortBy(action as SortOption);
    }
  };

  return (
    <List
      isLoading={isLoading || isSyncing}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search translation keys..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <FilterSortDropdown
          selectedPlatforms={selectedPlatforms}
          dropdownSelection={dropdownSelection}
          onChange={handleDropdownChange}
        />
      }
      throttle
    >
      {filteredKeys.length === 0 && !isLoading ? (
        <NoTranslationsFound searchText={searchText} onSync={() => handleSync(onSyncSuccess)} />
      ) : (
        filteredKeys.map((key) => (
          <TranslationListItem
            key={key.keyId}
            keyData={key}
            target={<TranslationDetail keyId={key.keyId} />}
            onSync={() => handleSync(onSyncSuccess)}
            showingDetail={showingDetail}
            onToggleDetail={() => handleToggleDetail(!showingDetail)}
          />
        ))
      )}
    </List>
  );
}
