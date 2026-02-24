import { ActionPanel, Action, List, Icon, showToast, Toast, open, Clipboard } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { LightdashContentItem } from "./types";
import {
  searchLightdashItems,
  getItemUrl,
  testConnection,
  getEffectivePreferences,
  PREFERENCES_MISSING_ERROR,
  AUTH_ERROR,
} from "./utils";

function WelcomeScreen({ errorMessage }: { errorMessage?: string }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Globe}
        title={errorMessage || "Configure Lightdash Connection"}
        description={
          errorMessage
            ? "Please check your extension preferences and try again."
            : "Set up your Lightdash connection in the extension preferences to get started."
        }
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function openExtensionPreferences() {
  open("raycast://extensions/endiruslan/lightdash-navigator");
}

function getItemIcon(item: LightdashContentItem): Icon {
  switch (item.contentType) {
    case "dashboard":
      return Icon.AppWindowGrid3x3;
    case "chart":
      return Icon.LineChart;
    case "space":
      return Icon.Folder;
    default:
      return Icon.Document;
  }
}

function getItemSubtitle(item: LightdashContentItem): string {
  const parts: string[] = [];
  if (item.space?.name) {
    parts.push(`Space: ${item.space.name}`);
  }
  if (item.contentType === "chart" && (item as { dashboard?: { name: string } | null }).dashboard?.name) {
    parts.push(`Dashboard: ${(item as { dashboard: { name: string } }).dashboard.name}`);
  }
  return parts.join(" | ");
}

function getItemTypeLabel(item: LightdashContentItem): string {
  switch (item.contentType) {
    case "dashboard":
      return "Dashboard";
    case "chart":
      return "Chart";
    case "space":
      return "Space";
    default:
      return "Item";
  }
}

function formatUserName(user: { firstName: string; lastName: string } | null): string | undefined {
  if (!user) return undefined;
  return `${user.firstName} ${user.lastName}`.trim() || undefined;
}

export default function LightdashSearchCommand() {
  const [items, setItems] = useState<LightdashContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Validate preferences
        try {
          getEffectivePreferences();
        } catch (e) {
          if (e instanceof Error && e.name === PREFERENCES_MISSING_ERROR) {
            setShowWelcome(true);
            setIsLoading(false);
            return;
          }
          throw e;
        }

        // Test connection on initial load
        if (searchText === "" && refreshKey === 0) {
          try {
            await testConnection(abortController.signal);
          } catch (e) {
            if (abortController.signal.aborted) return;
            if (e instanceof Error) {
              if (e.name === AUTH_ERROR || e.name === PREFERENCES_MISSING_ERROR) {
                setConnectionErrorMessage(e.message);
                setShowWelcome(true);
                setIsLoading(false);
                return;
              }
              setConnectionErrorMessage(e.message);
              setShowWelcome(true);
              setIsLoading(false);
              return;
            }
            throw e;
          }
        }

        // Search items
        const results = await searchLightdashItems(searchText, abortController.signal);
        if (abortController.signal.aborted) return;

        setItems(results);
        setShowWelcome(false);
      } catch (e) {
        if (abortController.signal.aborted) return;
        if (e instanceof Error) {
          if (e.name === AUTH_ERROR) {
            setConnectionErrorMessage(e.message);
            setShowWelcome(true);
          } else {
            setError(e);
          }
        } else {
          setError(new Error("An unexpected error occurred"));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [searchText, refreshKey]);

  if (showWelcome) {
    return <WelcomeScreen errorMessage={connectionErrorMessage} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => setRefreshKey((k) => k + 1)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Lightdash dashboards and charts..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No items match your search" : "No dashboards or charts found"}
          description={searchText ? "Try a different search term" : "Your project may not have any content yet."}
        />
      ) : (
        items.map((item) => (
          <List.Item
            key={`${item.contentType}-${item.uuid}`}
            icon={getItemIcon(item)}
            title={item.name}
            subtitle={getItemSubtitle(item)}
            accessories={[
              { tag: getItemTypeLabel(item) },
              ...(item.lastUpdatedAt
                ? [
                    {
                      date: new Date(item.lastUpdatedAt),
                      tooltip: `Updated: ${new Date(item.lastUpdatedAt).toLocaleString()}${formatUserName(item.lastUpdatedBy) ? ` by ${formatUserName(item.lastUpdatedBy)}` : ""}`,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  onAction={async () => {
                    try {
                      const url = getItemUrl(item);
                      await open(url);
                    } catch (e) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to open URL",
                        message: e instanceof Error ? e.message : "Unknown error",
                      });
                    }
                  }}
                />
                <Action
                  title="Copy URL"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    try {
                      const url = getItemUrl(item);
                      await Clipboard.copy(url);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "URL copied to clipboard",
                      });
                    } catch (e) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to copy URL",
                        message: e instanceof Error ? e.message : "Unknown error",
                      });
                    }
                  }}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => setRefreshKey((k) => k + 1)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
