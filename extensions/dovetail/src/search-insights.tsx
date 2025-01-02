import { useState, useEffect, useCallback, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Icon,
  ToastStyle,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import fetch from "node-fetch";
import { format } from "date-fns";

const DEFAULT_PAGE_SIZE = 100;

interface Insight {
  id: string;
  title: string;
  project_title: string;
  created_at: string;
}

export default function SearchInsights() {
  // Retrieve preferences, including the Dovetail API token
  const preferences = getPreferenceValues<{ dovetailApiToken: string }>();
  const apiToken = preferences.dovetailApiToken;

  const [query, setQuery] = useState("");
  const [data, setData] = useState<Insight[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const cancelRef = useRef<AbortController | null>(null);

  // Warn if we don't have an API token
  useEffect(() => {
    if (!apiToken) {
      showToast(
        ToastStyle.Failure,
        "API token missing",
        "Please enter your Dovetail API token in the extension preferences.",
      );
      openExtensionPreferences();
    }
  }, [apiToken]);

  function getShortDate(createdAt: Date) {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }
    if (diffHours < 48) {
      return "1d";
    }
    return format(createdAt, "MMM d");
  }

  function truncateString(str: string, maxLength = 50) {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - 1) + "…";
  }

  const searchDovetail = async (searchQuery: string, after?: string | null, signal?: AbortSignal) => {
    // Don’t attempt to fetch if no token is provided
    if (!apiToken) return;

    try {
      const response = await fetch("https://dovetail.com/api/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: DEFAULT_PAGE_SIZE,
          after,
          filter: {
            insights: [
              {
                title: {
                  contains: searchQuery,
                },
              },
            ],
          },
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const responseData = await response.json();

      setData((prev) => [...prev, ...responseData.data.insights]);

      if (responseData.data.pageInfo) {
        setHasNextPage(responseData.data.pageInfo.hasNextPage);
        setEndCursor(responseData.data.pageInfo.endCursor);
      } else {
        setHasNextPage(false);
        setEndCursor(null);
      }
    } catch (error: unknown) {
      if ((error as Error).name !== "AbortError") {
        showToast(ToastStyle.Failure, "Error fetching data", (error as Error).message);
      }
    }
  };

  const onLoadMore = useCallback(() => {
    if (hasNextPage) {
      searchDovetail(query, endCursor);
    }
  }, [hasNextPage, endCursor, query]);

  const onSearchTextChange = useCallback((text: string) => {
    setQuery(text);
    setData([]);
    setEndCursor(null);
  }, []);

  useEffect(() => {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    searchDovetail(query, null, cancelRef.current.signal);
    return () => cancelRef.current?.abort();
  }, [query]);

  const numberOfResults = data.length === 1 ? "1 result" : `${data.length} results`;

  return (
    <List
      isLoading={data === undefined}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search for insights in any project..."
      pagination={{ onLoadMore, hasMore: hasNextPage, pageSize: DEFAULT_PAGE_SIZE }}
    >
      <List.Section title="Most relevant" subtitle={numberOfResults}>
        {data.map((item) => {
          const createdAt = new Date(item.created_at);
          const accessories: List.Item.Accessory[] = [
            {
              text: getShortDate(createdAt),
              tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
            },
          ];

          return (
            <List.Item
              key={item.id}
              title={truncateString(item.title || "No Title", 60)}
              icon={{ source: Icon.Document }}
              subtitle={truncateString(item.project_title || "No project", 40)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Dovetail" url={`https://dovetail.com/insights/${item.id}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
