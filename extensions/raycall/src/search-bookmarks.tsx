import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "./config";
import {
  changeApiToken,
  copyUrl,
  manageSubscription,
  refresh,
  remove,
} from "./shortcuts";
import { Welcome, isConfigured } from "./welcome";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface SearchHit {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  score: number;
  snippet: string | null;
}

interface ListResult {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  status: "pending" | "indexed" | "failed";
  createdAt: string;
}

interface PendingItem {
  id: string;
  url: string;
  title: string | null;
  faviconUrl: string | null;
}

export default function SearchBookmarks() {
  const prefs = getPreferenceValues<Preferences.SearchBookmarks>();
  if (!isConfigured(prefs)) return <Welcome reason="missing-token" />;
  return <SearchBookmarksList apiToken={prefs.apiToken} />;
}

function SearchBookmarksList({ apiToken }: { apiToken: string }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);

  const trimmed = debouncedQuery.trim();
  const endpoint = trimmed
    ? `${API_URL}/api/search?q=${encodeURIComponent(trimmed)}&limit=20`
    : `${API_URL}/api/bookmarks?limit=50`;

  const { isLoading, data, revalidate, error } = useFetch<{
    results?: SearchHit[];
    bookmarks?: ListResult[];
    pending?: PendingItem[];
  }>(endpoint, {
    headers: { Authorization: `Bearer ${apiToken}` },
    keepPreviousData: true,
    parseResponse: async (response) => {
      if (response.status === 401) {
        const e = new Error("API token is missing or invalid");
        e.name = "Unauthorized";
        throw e;
      }
      if (response.status === 402) {
        const e = new Error("Subscription required");
        e.name = "SubscriptionRequired";
        throw e;
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response.json();
    },
  });

  const subscriptionRequired = error?.name === "SubscriptionRequired";
  const unauthorized = error?.name === "Unauthorized";

  const items = useMemo(() => {
    if (trimmed) {
      return (data?.results ?? []).map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title ?? r.url,
        score: r.score,
        faviconUrl: r.faviconUrl,
      }));
    }
    return (data?.bookmarks ?? [])
      .filter((b) => b.status === "indexed")
      .map((b) => ({
        id: b.id,
        url: b.url,
        title: b.title ?? b.url,
        score: null as number | null,
        faviconUrl: b.faviconUrl,
      }));
  }, [data, trimmed]);

  const pendingItems = useMemo<PendingItem[]>(() => {
    if (trimmed) return data?.pending ?? [];
    return (data?.bookmarks ?? [])
      .filter((b) => b.status === "pending")
      .map((b) => ({
        id: b.id,
        url: b.url,
        title: b.title,
        faviconUrl: b.faviconUrl,
      }));
  }, [data, trimmed]);

  async function deleteBookmark(id: string, title: string) {
    const ok = await confirmAlert({
      title: "Delete bookmark?",
      message: title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_URL}/api/bookmarks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (res.ok) {
        await showToast({ style: Toast.Style.Success, title: "Deleted" });
        revalidate();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete failed",
          message: `${res.status}`,
        });
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        trimmed ? "Searching…" : "Search your bookmarks in natural language"
      }
      onSearchTextChange={setQuery}
      throttle
    >
      {unauthorized ? (
        <List.EmptyView
          icon={Icon.Key}
          title="API token is missing or invalid"
          description="Generate a fresh token in the dashboard, then update it in Raycast preferences."
          actions={
            <ActionPanel>
              <Action
                title="Change API Token"
                icon={Icon.Key}
                onAction={openExtensionPreferences}
              />
              <Action.OpenInBrowser
                title="Open Dashboard"
                icon={Icon.Globe}
                url={`${API_URL}/dashboard/tokens`}
              />
            </ActionPanel>
          }
        />
      ) : subscriptionRequired ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Subscription required"
          description="Start a 7-day free trial to use Raycall."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Manage Subscription"
                icon={Icon.CreditCard}
                url={`${API_URL}/dashboard/billing`}
              />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Request failed"
          description={error.message}
        />
      ) : items.length === 0 && pendingItems.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={trimmed ? "No matches" : "No bookmarks yet"}
          description={
            trimmed
              ? "Try a different query."
              : "Use the Save URL command to add one."
          }
        />
      ) : (
        <>
          {pendingItems.length > 0 && (
            <List.Section title="Indexing" subtitle={`${pendingItems.length}`}>
              {pendingItems.map((p) => (
                <List.Item
                  key={p.id}
                  title={p.title ?? p.url}
                  subtitle={p.title ? p.url : undefined}
                  icon={p.faviconUrl ?? Icon.Hourglass}
                  accessories={[
                    { tag: { value: "Indexing", color: Color.Purple } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={p.url} />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={p.url}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          <List.Section title={trimmed ? "Matches" : "Bookmarks"}>
            {items.map((item) => (
              <List.Item
                key={item.id}
                title={item.title}
                icon={item.faviconUrl ?? Icon.Bookmark}
                accessories={
                  item.score != null
                    ? [
                        {
                          tag: {
                            value: item.score.toFixed(2),
                            color: scoreColor(item.score),
                          },
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={item.url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={item.url}
                      shortcut={copyUrl}
                    />
                    <Action
                      title="Delete Bookmark"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={remove}
                      onAction={() => deleteBookmark(item.id, item.title)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={refresh}
                      onAction={revalidate}
                    />
                    <Action
                      title="Change API Token"
                      icon={Icon.Key}
                      shortcut={changeApiToken}
                      onAction={openExtensionPreferences}
                    />
                    <Action.OpenInBrowser
                      title="Manage Subscription"
                      icon={Icon.CreditCard}
                      shortcut={manageSubscription}
                      url={`${API_URL}/dashboard/billing`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function scoreColor(score: number): Color {
  if (score >= 0.75) return Color.Green;
  if (score >= 0.5) return Color.Yellow;
  return Color.Red;
}
