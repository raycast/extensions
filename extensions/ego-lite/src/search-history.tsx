import { existsSync } from "node:fs";

import { Icon, List } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrowserItem } from "./components/browser-item";
import { buildHistoryQuery, type HistoryItem } from "./lib/history";
import { activeProfilePath } from "./lib/profile";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 200);
  const { data: historyPath, isLoading: isLoadingPath } = usePromise(() => activeProfilePath("History"), []);
  const databaseExists = Boolean(historyPath && existsSync(historyPath));
  const query = useMemo(() => buildHistoryQuery(debouncedSearch), [debouncedSearch]);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data, error, isLoading, permissionView, revalidate } = useSQL<HistoryItem>(
    databaseExists && historyPath ? historyPath : __filename,
    query,
    {
      execute: databaseExists,
      permissionPriming: "Full Disk Access is required only to search your local Ego Lite browsing history.",
    },
  );

  useEffect(() => {
    if (!error) {
      retryCount.current = 0;
      return;
    }
    if (retryCount.current >= 1) return;

    retryCount.current += 1;
    retryTimer.current = setTimeout(() => revalidate(), 1000);
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [error, revalidate]);

  if (permissionView) return permissionView;

  const history = data ?? [];
  const missingDatabase = Boolean(historyPath && !databaseExists);

  return (
    <List
      isLoading={isLoadingPath || isLoading}
      searchBarPlaceholder="Search history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {missingDatabase ? (
        <List.EmptyView
          title="Ego Lite History Not Found"
          description="Browse with Ego Lite first, then reopen this command."
          icon={Icon.Clock}
        />
      ) : error && retryCount.current >= 1 ? (
        <List.EmptyView title="Could Not Read History" description={error.message} icon={Icon.XMarkCircle} />
      ) : history.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText.trim().length >= 2 ? "No Matching History" : "No Ego Lite History"}
          description={searchText.trim().length >= 2 ? "Try a different title or URL." : undefined}
          icon={Icon.Clock}
        />
      ) : (
        history.map((item) => (
          <BrowserItem
            key={`${item.id}-${item.url}`}
            title={item.title}
            url={item.url}
            lastVisitedAt={item.lastVisitedAt}
          />
        ))
      )}
    </List>
  );
}
