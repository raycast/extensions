import { useEffect, useState, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  open,
  popToRoot,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { Shortcut, API_TOKEN_REGEX } from "./lib/types";
import { fetchShortcuts, ApiError } from "./lib/api";
import { getCacheState, setCache, clearCache } from "./lib/cache";

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getUserFriendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return "Invalid API token. Check your token in extension preferences.";
      case 404:
        return "No shortcuts found. Add shortcuts in your QuickLinker dashboard.";
      case 429: {
        const retryMsg = error.retryAfterSeconds
          ? ` Try again in ${error.retryAfterSeconds}s.`
          : "";
        return `Rate limited.${retryMsg}`;
      }
      case 500:
        return "QuickLinker server error. Please try again later.";
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function showErrorToast(error: unknown) {
  const message = getUserFriendlyError(error);

  if (error instanceof ApiError && error.statusCode === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message,
      primaryAction: {
        title: "Open Extension Preferences",
        onAction: () => openExtensionPreferences(),
      },
      secondaryAction: {
        title: "Open QuickLinker Dashboard",
        onAction: () => open("https://quicklinker.app/dashboard/settings"),
      },
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Shortcuts",
      message,
    });
  }
}

export default function SearchShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { apiToken } = getPreferenceValues();

  const tokenValid = !!apiToken && API_TOKEN_REGEX.test(apiToken);

  const loadShortcuts = useCallback(
    async (forceRefresh = false, signal?: AbortSignal) => {
      if (!tokenValid || !apiToken) {
        setIsLoading(false);
        return;
      }

      try {
        const cacheState = forceRefresh
          ? ({ status: "miss" } as const)
          : await getCacheState();

        switch (cacheState.status) {
          case "fresh":
            setShortcuts(cacheState.shortcuts);
            setIsLoading(false);
            return;

          case "stale":
            setShortcuts(cacheState.shortcuts);
            setIsLoading(false);
            fetchShortcuts(apiToken, signal)
              .then(async (fresh) => {
                if (!signal || !signal.aborted) {
                  setShortcuts(fresh);
                  await setCache(fresh);
                }
              })
              .catch(async (error) => {
                if (isAbortError(error)) {
                  return;
                }
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Using cached data",
                  message: getUserFriendlyError(error),
                });
              });
            return;

          case "miss":
            setIsLoading(true);
            if (forceRefresh) {
              await clearCache();
            }
            try {
              const fresh = await fetchShortcuts(apiToken, signal);
              if (!signal || !signal.aborted) {
                setShortcuts(fresh);
                await setCache(fresh);
              }
            } catch (error) {
              if (isAbortError(error)) {
                return;
              }
              await showErrorToast(error);
            } finally {
              setIsLoading(false);
            }
            return;
        }
      } catch (error) {
        setIsLoading(false);
        await showErrorToast(error);
      }
    },
    [apiToken, tokenValid],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadShortcuts(false, controller.signal);
    return () => controller.abort();
  }, [loadShortcuts]);

  if (!tokenValid) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Key}
          title="API Token Required"
          description={
            "To use Search Shortcuts, enable API access in your QuickLinker dashboard:\n\n" +
            "Dashboard → Settings → Advanced → Enable API Access\n\n" +
            "Then paste the token in this extension's preferences."
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action.OpenInBrowser
                title="Open QuickLinker Dashboard"
                url="https://quicklinker.app/dashboard/settings"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && shortcuts.length === 0) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Stars}
          title="No Shortcuts Found"
          description="Add shortcuts in your QuickLinker dashboard to see them here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open QuickLinker Dashboard"
                url="https://quicklinker.app/dashboard"
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => loadShortcuts(true)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shortcuts...">
      {shortcuts.map((item) => {
        const hostname = getHostname(item.url);
        const displayTitle = item.title || item.shortcut;
        const subtitle = item.title ? item.shortcut : undefined;

        return (
          <List.Item
            key={item.shortcut}
            icon={getFavicon(item.url, { fallback: Icon.Link })}
            title={displayTitle}
            subtitle={subtitle}
            accessories={
              hostname
                ? [{ text: hostname, tooltip: item.url }]
                : [{ icon: Icon.Globe, tooltip: item.url }]
            }
            keywords={[item.shortcut, item.url, item.title ?? ""]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={item.url}
                    onOpen={() => popToRoot({ clearSearchBar: true })}
                  />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={item.url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Shortcut Name"
                    content={item.shortcut}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh Shortcuts"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => loadShortcuts(true)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
