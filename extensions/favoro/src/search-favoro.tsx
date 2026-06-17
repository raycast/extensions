import { useCallback, useMemo } from "react";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useAuth } from "./hooks/useAuth";
import { useSearch } from "./hooks/useSearch";
import { useCache } from "./hooks/useCache";
import { useFavorites } from "./hooks/useFavorites";
import { LinkItem } from "./components/LinkItem";
import { formatLastSynced } from "./lib/cache";
import type { CachedData, SearchResultLink } from "./types";

export default function Command() {
  const { isAuthenticated, isLoading: authLoading, error: authError, authorize, logout } = useAuth();
  const { favoriteIds, isFavorite, toggleFavorite, validateFavorites, clearFavorites } = useFavorites();

  // Handle cache sync completion - validate favorites
  const handleSyncComplete = useCallback(
    (data: CachedData) => {
      const validLinkIds = new Set(data.links.map((link) => link.id));
      void validateFavorites(validLinkIds);
    },
    [validateFavorites],
  );

  const {
    data: cacheData,
    status: cacheStatus,
    lastSynced,
    isLoading: cacheLoading,
    sync: syncCache,
    clear: clearCache,
  } = useCache({ onSyncComplete: handleSyncComplete });
  const { groupedResults, isLoading: searchLoading, query, search } = useSearch(cacheData);

  // Get favorite links from cache
  const favoriteLinks = useMemo((): SearchResultLink[] => {
    if (!cacheData || favoriteIds.size === 0) return [];

    // Build lookup maps for area/section info
    const areaMap = new Map(cacheData.areas.map((a) => [a.id, a]));
    const sectionMap = new Map(cacheData.sections.map((s) => [s.id, s]));

    return cacheData.links
      .filter((link) => favoriteIds.has(link.id))
      .map((link) => {
        const areaRef = link.relationships?.area?.data;
        const sectionRef = link.relationships?.section?.data;
        const areaId = areaRef && !Array.isArray(areaRef) ? areaRef.id : undefined;
        const sectionId = sectionRef && !Array.isArray(sectionRef) ? sectionRef.id : undefined;

        const area = areaId ? areaMap.get(areaId) : undefined;
        const section = sectionId ? sectionMap.get(sectionId) : undefined;

        return {
          ...link,
          area: area ? { id: area.id, name: area.attributes.name } : undefined,
          section: section ? { id: section.id, name: section.attributes.title } : undefined,
        };
      });
  }, [cacheData, favoriteIds]);

  // Handle logout - clear favorites too
  const handleLogout = useCallback(async () => {
    await clearFavorites();
    await clearCache();
    logout();
  }, [clearFavorites, clearCache, logout]);

  // Show loading state while checking authentication
  if (authLoading && !isAuthenticated) {
    return <List isLoading={true} searchBarPlaceholder="Loading..." />;
  }

  // Show connect prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Link}
          title="Connect to FAVORO"
          description={
            authError
              ? `${authError.message}\n\nPress Enter to try again.`
              : "Connect your FAVORO account to access your bookmarks."
          }
          actions={
            <ActionPanel>
              <Action title="Connect to FAVORO" icon={Icon.Link} onAction={authorize} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Check if we have any results (including favorites)
  const areaIds = Object.keys(groupedResults);
  const hasResults = areaIds.length > 0 || favoriteLinks.length > 0;

  // Determine if we should show favorites section (only in browse mode, not search)
  const showFavorites = !query.trim() && favoriteLinks.length > 0;

  // Determine loading state - show loading when syncing cache initially or searching via API
  const isLoading = (cacheLoading && cacheStatus === "syncing") || searchLoading;

  // Build cache status subtitle
  const getCacheStatusText = (): string => {
    if (cacheStatus === "syncing") {
      return "Syncing...";
    }
    if (cacheStatus === "fresh" && cacheData) {
      return `${cacheData.links.length} links cached`;
    }
    if (cacheStatus === "stale" && cacheData) {
      return `${cacheData.links.length} links (stale)`;
    }
    if (cacheStatus === "empty") {
      return "No cache";
    }
    if (cacheStatus === "error") {
      return "Sync error";
    }
    return "";
  };

  // Build footer text
  const getFooterText = (): string => {
    const statusText = getCacheStatusText();
    const lastSyncedText = formatLastSynced(lastSynced);
    if (statusText && lastSyncedText !== "Never synced") {
      return `${statusText} • Last synced: ${lastSyncedText}`;
    }
    return statusText || lastSyncedText;
  };

  // Authenticated state - show search interface
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter bookmarks..." onSearchTextChange={search} throttle>
      {!hasResults && !isLoading ? (
        // Empty state: no cache or no matches for query
        <List.EmptyView
          icon={query.trim() ? Icon.MagnifyingGlass : Icon.Bookmark}
          title={query.trim() ? "No Bookmarks Found" : "No Bookmarks"}
          description={
            query.trim()
              ? `No bookmarks found for "${query}"`
              : `Your bookmarks will appear here after syncing\n\n${getFooterText()}`
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Cache"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => syncCache(true)}
              />
              <Action
                title="Disconnect from FAVORO"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                onAction={handleLogout}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {/* Favorites section - only shown in browse mode */}
          {showFavorites && (
            <List.Section
              title="Favorites"
              subtitle={`${favoriteLinks.length} link${favoriteLinks.length > 1 ? "s" : ""}`}
            >
              {favoriteLinks.map((link) => (
                <LinkItem
                  key={`fav-${link.id}`}
                  link={link}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(link.id)}
                />
              ))}
            </List.Section>
          )}

          {/* Grouped results (all links when empty query, filtered when searching) */}
          {areaIds.map((areaId) => {
            const areaData = groupedResults[areaId];
            const sectionIds = Object.keys(areaData.sections);

            return sectionIds.map((sectionId) => {
              const sectionData = areaData.sections[sectionId];
              const sectionTitle =
                areaData.area.name === "Uncategorized"
                  ? sectionData.section.name
                  : `${areaData.area.name} › ${sectionData.section.name}`;

              return (
                <List.Section key={`${areaId}-${sectionId}`} title={sectionTitle}>
                  {sectionData.links.map((link) => (
                    <LinkItem
                      key={link.id}
                      link={link}
                      isFavorite={isFavorite(link.id)}
                      onToggleFavorite={() => toggleFavorite(link.id)}
                    />
                  ))}
                </List.Section>
              );
            });
          })}
        </>
      )}
    </List>
  );
}
