import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useState, useEffect } from "react";
import { TwingateStorage } from "./utils/storage";
import { RecentResource } from "./types";
import { DebugLogger } from "./utils/debug";
import { ResourceListItem } from "./components/ResourceListItem";
import { useFavorites } from "./hooks/useFavorites";
import { parseShortcut, DEFAULT_SHORTCUTS } from "./utils/shortcuts";

export default function RecentResourcesCommand() {
  const [debugMode, setDebugMode] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  // Use shared favorites hook without pinToTop (pure chronological order)
  const { favorites, toggleFavorite } = useFavorites({ pinToTop: false });

  // Parse shortcuts from preferences
  const shortcuts = {
    refreshResources:
      parseShortcut(preferences.shortcutRefreshResources) ||
      DEFAULT_SHORTCUTS.refreshResources,
    clearData:
      parseShortcut(preferences.shortcutClearData) ||
      DEFAULT_SHORTCUTS.clearData,
    debugMode:
      parseShortcut(preferences.shortcutDebugMode) ||
      DEFAULT_SHORTCUTS.debugMode,
    exportLogs:
      parseShortcut(preferences.shortcutExportLogs) ||
      DEFAULT_SHORTCUTS.exportLogs,
    toggleFavorite:
      parseShortcut(preferences.shortcutToggleFavorite) ||
      DEFAULT_SHORTCUTS.toggleFavorite,
    copyUrl:
      parseShortcut(preferences.shortcutCopyUrl) || DEFAULT_SHORTCUTS.copyUrl,
    copyAddress:
      parseShortcut(preferences.shortcutCopyAddress) ||
      DEFAULT_SHORTCUTS.copyAddress,
    copyAlias:
      parseShortcut(preferences.shortcutCopyAlias) ||
      DEFAULT_SHORTCUTS.copyAlias,
    copyName:
      parseShortcut(preferences.shortcutCopyName) || DEFAULT_SHORTCUTS.copyName,
    openMainSearch:
      parseShortcut(preferences.shortcutOpenMainSearch) ||
      DEFAULT_SHORTCUTS.openMainSearch,
  };

  // Initialize debug mode
  useEffect(() => {
    const initializeData = async () => {
      try {
        await DebugLogger.initializeDebugMode();
        setDebugMode(DebugLogger.getDebugStats().isDebugMode);

        DebugLogger.info("Recent resources initialized", {
          debugMode: DebugLogger.getDebugStats().isDebugMode,
        });
      } catch (error) {
        DebugLogger.error("Failed to initialize recent resources", error);
      }
    };

    initializeData();
  }, []);

  const {
    data: recentResourcesData,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      try {
        DebugLogger.debug("Cache miss: loading recent resources from storage");
        const recentList = await TwingateStorage.getRecentResources();
        DebugLogger.info("Recent resources loaded and cached", {
          count: recentList.length,
          cacheStatus: "updated",
        });
        return recentList;
      } catch (error) {
        DebugLogger.error("Failed to load recent resources from storage", {
          error: error instanceof Error ? error.message : String(error),
          cacheStatus: "failed",
        });
        return [];
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      onError: (error) => {
        DebugLogger.error("Recent resources cache error handler", { error });
      },
      onData: (data) => {
        DebugLogger.debug("Recent resources cache data received", {
          resourceCount: data?.length || 0,
          cacheStatus: "hit",
        });
      },
    },
  );

  // Sort recent resources: by most recent access only (favorites get star icon but no priority)
  const sortedRecentResources = React.useMemo(() => {
    if (!recentResourcesData) return [];

    return recentResourcesData.sort((a, b) => {
      // Sort purely by most recent access
      return b.timestamp - a.timestamp;
    });
  }, [recentResourcesData]);

  // Helper functions for resource access
  const openResource = async (resource: RecentResource) => {
    try {
      // Track resource access (updates the recent timestamp)
      await TwingateStorage.addRecentResource(
        resource.id,
        resource.name,
        resource.url,
        resource.address,
        resource.networkName,
        resource.alias,
      );
      DebugLogger.info("Resource accessed from recent", {
        resourceId: resource.id,
        resourceName: resource.name,
      });
      revalidate(); // Refresh to update the access time
    } catch (error) {
      DebugLogger.error("Failed to track resource access", error);
    }
  };

  const clearRecent = async () => {
    try {
      await TwingateStorage.clearAllData();
      revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Cleared Recent Resources",
        message: "All recent resources have been cleared",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Clear Failed",
        message: "Please try again",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent resources..."
      actions={
        <ActionPanel>
          <Action
            title="Clear Recent Resources"
            icon={Icon.Trash}
            onAction={clearRecent}
            shortcut={shortcuts.clearData}
          />
        </ActionPanel>
      }
    >
      {sortedRecentResources?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Recent Resources"
          description="Resources you access will appear here"
        />
      ) : (
        sortedRecentResources?.map((resource) => (
          <ResourceListItem
            key={resource.id}
            resource={resource}
            isFavorite={favorites.has(resource.id)}
            onToggleFavorite={() => toggleFavorite(resource.id, resource.name)}
            onOpen={() => openResource(resource)}
            showRecentTime={true}
            debugMode={debugMode}
            onToggleDebugMode={async () => {
              const isEnabled = await DebugLogger.toggleDebugMode();
              setDebugMode(isEnabled);
              showToast({
                style: Toast.Style.Success,
                title: "Debug Mode",
                message: isEnabled ? "Enabled" : "Disabled",
              });
            }}
            shortcuts={shortcuts}
          />
        ))
      )}
    </List>
  );
}

// Local RecentResourceItem function removed - now using shared ResourceListItem component
