import { Action, ActionPanel, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

type Preferences = {
  defaultUrl?: string;
};

type Snapshot = {
  original: string;
  mimetype: string;
  timestamp: string;
  endtimestamp: string;
  groupcount: string;
  uniqcount: string;
};

const PAGE_SIZE = 20;

export default function SearchWebArchive() {
  const { defaultUrl } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(defaultUrl ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const allSnapshotsRef = useRef<Snapshot[]>([]);
  const nextIndexRef = useRef(0);

  const loadNextPage = useCallback(() => {
    const allSnapshots = allSnapshotsRef.current;
    const nextIndex = nextIndexRef.current;
    const nextSnapshots = allSnapshots.slice(nextIndex, nextIndex + PAGE_SIZE);

    if (nextSnapshots.length === 0) {
      setHasMore(false);
      return;
    }

    nextIndexRef.current = nextIndex + nextSnapshots.length;
    setSnapshots((current) => [...current, ...nextSnapshots]);
    setHasMore(nextIndexRef.current < allSnapshots.length);
  }, []);

  useEffect(() => {
    if (!searchText) {
      setSnapshots([]);
      setHasMore(false);
      allSnapshotsRef.current = [];
      nextIndexRef.current = 0;
      return;
    }

    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const result = await fetchPages(searchText);
        if (!cancelled) {
          const initialSnapshots = result.slice(0, PAGE_SIZE);
          allSnapshotsRef.current = result;
          setSnapshots(initialSnapshots);
          nextIndexRef.current = initialSnapshots.length;
          setHasMore(result.length > initialSnapshots.length);
        }
      } catch (error) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
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
  }, [searchText]);

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
        const { snapshotUrl, calendarUrl } = buildSnapshotUrls(snapshot);

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
            key={`${snapshot.original}-${snapshot.timestamp}`}
            icon={Icon.Globe}
            id={snapshot.original}
            title={{ value: snapshot.original, tooltip: "Original URL" }}
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
                  content={snapshot.original}
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

function buildSnapshotUrls(snapshot: Snapshot) {
  // snapshotUrl points to a specific archived capture.
  // calendarUrl opens the Wayback calendar view for pages with multiple captures.
  return {
    snapshotUrl: `https://web.archive.org/web/${snapshot.endtimestamp}/${snapshot.original}`,
    calendarUrl: `https://web.archive.org/web/${snapshot.endtimestamp}*/${snapshot.original}`,
  };
}

function buildTimemapUrl(rawUrl: string) {
  const params = new URLSearchParams({
    url: rawUrl,
    matchType: "prefix",
    collapse: "urlkey",
    output: "json",
    fl: "original,mimetype,timestamp,endtimestamp,groupcount,uniqcount",
    filter: "!statuscode:[45]..",
    limit: "10000",
    _: String(Date.now()),
  });

  return `https://web.archive.org/web/timemap/json?${params.toString()}`;
}

async function fetchPages(targetUrl: string): Promise<Snapshot[]> {
  const timemapUrl = buildTimemapUrl(targetUrl);

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
