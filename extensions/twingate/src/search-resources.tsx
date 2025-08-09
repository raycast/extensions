import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  getPreferenceValues,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useState, useEffect } from "react";
import { TwingateApi, TwingateError, TwingateErrorType } from "./api/twingate";
import { ResourceListItem as ResourceData } from "./types";
import { TwingateStorage } from "./utils/storage";
import { DebugLogger } from "./utils/debug";
import { ResourceListItem } from "./components/ResourceListItem";
import { useFavorites } from "./hooks/useFavorites";
import { parseShortcut, DEFAULT_SHORTCUTS } from "./utils/shortcuts";

// Helper function for error toast configuration
function getErrorToastConfig(error: TwingateError): {
  title: string;
  message: string;
} {
  switch (error.type) {
    case TwingateErrorType.AUTHENTICATION:
      return {
        title: "Authentication Error",
        message: error.message,
      };
    case TwingateErrorType.NETWORK:
      return {
        title: "Network Error",
        message: error.message,
      };
    case TwingateErrorType.TIMEOUT:
      return {
        title: "Connection Timeout",
        message: error.message,
      };
    case TwingateErrorType.API_LIMIT:
      return {
        title: "API Rate Limit",
        message: error.message,
      };
    case TwingateErrorType.INVALID_RESPONSE:
      return {
        title: "Invalid Response",
        message: error.message,
      };
    default:
      return {
        title: "Error Loading Resources",
        message: error.message,
      };
  }
}

export default function SearchResourcesCommand() {
  const [searchText, setSearchText] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const preferences = getPreferenceValues<Preferences>();
  const twingateApi = new TwingateApi();

  // Use shared favorites hook with pinToTop enabled
  const { favorites, toggleFavorite, sortWithFavorites } = useFavorites({
    pinToTop: true,
  });

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

        DebugLogger.info("Extension initialized", {
          debugMode: DebugLogger.getDebugStats().isDebugMode,
        });
      } catch (error) {
        DebugLogger.error("Failed to initialize extension", error);
      }
    };

    initializeData();
  }, []);

  const {
    data: resources,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      try {
        DebugLogger.debug("Cache miss: fetching fresh resources from API");
        const resources = await twingateApi.getAllResources();
        DebugLogger.info("Fresh resources fetched and cached", {
          resourceCount: resources.length,
          cacheStatus: "updated",
        });
        return resources;
      } catch (err) {
        DebugLogger.error("Failed to fetch fresh resources", {
          error: err instanceof Error ? err.message : String(err),
          cacheStatus: "failed",
        });
        // Enhanced error handling with specific messages
        if (err instanceof TwingateError) {
          const errorConfig = getErrorToastConfig(err);
          showToast({
            style: Toast.Style.Failure,
            title: errorConfig.title,
            message: errorConfig.message,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to Load Resources",
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          });
        }
        throw err;
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      onError: (error) => {
        DebugLogger.error("Cache promise error handler", { error });
        console.error("Error loading resources:", error);
      },
      onData: (data) => {
        DebugLogger.debug("Cache data received", {
          resourceCount: data?.length || 0,
          cacheStatus: "hit",
        });
      },
    },
  );

  // Enhanced search with better performance and more filters
  const filteredResources = React.useMemo(() => {
    if (!resources) return resources;

    let filtered = resources;

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const searchTerms = searchLower
        .split(" ")
        .filter((term) => term.length > 0);

      filtered = resources.filter((resource) => {
        const searchableText = [
          resource.name,
          resource.address,
          resource.networkName,
          resource.alias || "",
        ]
          .join(" ")
          .toLowerCase();

        // All search terms must match somewhere in the resource
        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    // Sort: favorites first, then by name
    return sortWithFavorites(filtered, (a, b) => a.name.localeCompare(b.name));
  }, [resources, searchText, favorites, sortWithFavorites]);

  const openResource = async (resource: ResourceData) => {
    try {
      // Track resource access
      await TwingateStorage.addRecentResource(
        resource.id,
        resource.name,
        resource.url,
        resource.address,
        resource.networkName,
        resource.alias,
      );
      DebugLogger.info("Resource accessed", {
        resourceId: resource.id,
        resourceName: resource.name,
      });
    } catch (error) {
      DebugLogger.error("Failed to track resource access", error);
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Resources"
          description="Please check your API credentials and network connectivity"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search resources by name, address, network... (supports multiple terms)"
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh Resources"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={shortcuts.refreshResources}
          />
          <Action
            title="Clear All Data"
            icon={Icon.Trash}
            onAction={async () => {
              try {
                await TwingateStorage.clearAllData();
                showToast({
                  style: Toast.Style.Success,
                  title: "Data Cleared",
                  message: "All favorites and recent resources cleared",
                });
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Clear Failed",
                  message: "Please try again",
                });
              }
            }}
            shortcut={shortcuts.clearData}
          />
          <Action
            title={`Debug Mode: ${debugMode ? "On" : "Off"}`}
            icon={debugMode ? Icon.Bug : Icon.CodeBlock}
            onAction={async () => {
              const isEnabled = await DebugLogger.toggleDebugMode();
              setDebugMode(isEnabled);
              showToast({
                style: Toast.Style.Success,
                title: "Debug Mode",
                message: isEnabled ? "Enabled" : "Disabled",
              });
            }}
            shortcut={shortcuts.debugMode}
          />
          <Action
            title="Export Debug Logs"
            icon={Icon.Document}
            onAction={async () => {
              try {
                const logs = DebugLogger.exportLogs();
                await Clipboard.copy(logs);
                const stats = DebugLogger.getDebugStats();
                showToast({
                  style: Toast.Style.Success,
                  title: "Debug Logs Exported",
                  message: `${stats.logCount} logs copied to clipboard`,
                });
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Export Failed",
                  message: "Please try again",
                });
              }
            }}
            shortcut={shortcuts.exportLogs}
          />
        </ActionPanel>
      }
    >
      {filteredResources?.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Resources Found"
          description={
            searchText
              ? "Try a different search term"
              : "No resources available"
          }
        />
      ) : (
        filteredResources?.map((resource) => (
          <ResourceListItem
            key={resource.id}
            resource={resource}
            isFavorite={favorites.has(resource.id)}
            onToggleFavorite={() => toggleFavorite(resource.id, resource.name)}
            onOpen={() => openResource(resource)}
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

// Local ResourceListItem function removed - now using shared component
