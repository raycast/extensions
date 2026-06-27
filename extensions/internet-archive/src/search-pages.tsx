import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";

type Snapshot = {
  original: string;
  mimetype: string;
  timestamp: string;
  endtimestamp: string;
  groupcount: string;
  uniqcount: string;
};

const PAGE_SIZE = 20;

export default function SearchPages() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const trimmedSearchText = searchText.trim();

  const loadNextPage = useCallback(() => {
    if (!trimmedSearchText) {
      return;
    }

    const nextPage = pageRef.current + 1;

    void (async () => {
      setIsLoading(true);
      try {
        const nextSnapshots = await fetchPages(trimmedSearchText, nextPage, PAGE_SIZE);

        if (nextSnapshots.length === 0) {
          setHasMore(false);
          pageRef.current = nextPage;
          await showToast({
            style: Toast.Style.Success,
            title: "No more results",
          });
          return;
        }

        setSnapshots((current) => [...current, ...nextSnapshots]);
        pageRef.current = nextPage;
        setHasMore(nextSnapshots.length === PAGE_SIZE);
      } catch (error) {
        await showFailureToast(error, {
          title: "Request Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [trimmedSearchText]);

  useEffect(() => {
    pageRef.current = 0;

    if (!trimmedSearchText) {
      setSnapshots([]);
      setHasMore(false);
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const result = await fetchPages(trimmedSearchText, 0, PAGE_SIZE);
        if (!cancelled) {
          setSnapshots(result);
          setHasMore(result.length === PAGE_SIZE);
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshots([]);
          setHasMore(false);
          await showFailureToast(error, {
            title: "Request Failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [trimmedSearchText]);

  return (
    <List
      isLoading={isLoading}
      pagination={{ hasMore, onLoadMore: loadNextPage, pageSize: PAGE_SIZE }}
      searchBarPlaceholder="Enter a URL "
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {snapshots.map((snapshot) => {
        const { snapshotUrl, calendarUrl, displayUrl } = buildUrls(snapshot);

        const timestampText = formatTimestamp(snapshot.timestamp);
        const endtimestampText = formatTimestamp(snapshot.endtimestamp);

        const tooltipList = [
          `From: ${timestampText}`,
          `To: ${endtimestampText}`,
          `Captures: ${snapshot.groupcount}`,
          `Uniques: ${snapshot.uniqcount}`,
          `Duplicates: ${Number(snapshot.groupcount) - Number(snapshot.uniqcount)}`,
        ];

        const accessories: List.Item.Props["accessories"] = [
          { tag: endtimestampText, tooltip: tooltipList.join("\n") },
        ];

        return (
          <List.Item
            key={snapshot.original}
            icon={Icon.Globe}
            id={snapshot.original}
            title={displayUrl}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={snapshotUrl} />
                {snapshot.uniqcount !== "1" ? (
                  <Action.OpenInBrowser title="Open Calendar View in Browser" url={calendarUrl} />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy Snapshot URL"
                  content={snapshotUrl}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "c" },
                    Windows: { modifiers: ["ctrl"], key: "c" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Original URL"
                  content={displayUrl}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "c" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatTimestamp(timestamp: string) {
  if (!timestamp) {
    return "";
  }

  return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
}

function buildUrls(snapshot: Snapshot) {
  // snapshotUrl points to a specific archived capture.
  // calendarUrl opens the Wayback calendar view for pages with multiple captures.

  let displayUrl = "";
  try {
    displayUrl = escapeUrl(decodeURI(snapshot.original));
  } catch {
    displayUrl = escapeUrl(snapshot.original);
  }

  // timestamp === endtimestamp
  const snapshotUrl = escapeUrl(`/web/${snapshot.timestamp}/${snapshot.original}`);
  const calendarUrl = escapeUrl(`/web/${snapshot.timestamp}*/${snapshot.original}`);

  return {
    displayUrl,
    snapshotUrl: `https://web.archive.org${snapshotUrl}`,
    calendarUrl: `https://web.archive.org${calendarUrl}`,
  };
}

const URL_ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as const;

function escapeUrl(url: string) {
  return url.replace(/[&<>"']/g, (s) => URL_ESCAPE_MAP[s as keyof typeof URL_ESCAPE_MAP]);
}

// https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
function buildTimemapUrl(rawUrl: string, page: number, limit: number) {
  const params = new URLSearchParams({
    url: rawUrl,
    matchType: "prefix",
    collapse: "urlkey",
    output: "json",
    fl: "original,mimetype,timestamp,endtimestamp,groupcount,uniqcount",
    filter: "mimetype:text/html",
    page: String(page),
    limit: String(limit),
  });

  return `https://web.archive.org/cdx/search/cdx?${params.toString()}`;
}

async function fetchPages(targetUrl: string, page: number, limit: number): Promise<Snapshot[]> {
  const timemapUrl = buildTimemapUrl(targetUrl, page, limit);

  let response: Response;
  try {
    response = await fetch(timemapUrl);
  } catch (error) {
    console.log("[search-pages] fetch error:", error);
    throw new Error(`Network error when requesting timemap: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data) || data.length < 2) {
    return [];
  }

  const rows = data.slice(1) as unknown[];

  const snapshots = rows
    .map((row) => {
      if (!Array.isArray(row) || row.length < 6) {
        return null;
      }
      const [original, mimetype, timestamp, endtimestamp, groupcount, uniqcount] = row as string[];
      return { original, mimetype, timestamp, endtimestamp, groupcount, uniqcount };
    })
    .filter((item): item is Snapshot => Boolean(item));
  // .sort((a, b) => b.endtimestamp.localeCompare(a.endtimestamp));

  return snapshots;
}
