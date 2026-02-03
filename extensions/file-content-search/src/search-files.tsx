import { List } from "@raycast/api";
import { FC, useCallback, useRef, useState } from "react";
import { EmptyView, SearchHistoryList, GrepResultsList } from "./components";
import { IS_DEV } from "./constants";
import { useConfig, useGrep, useHeapSize, useHistory } from "./hooks";
import { buildGrepCommand, formatLocationName, type ToastInstance, toast } from "./utils";

/** Debug component - only shown in dev mode */
const DebugHeapMonitor: FC = () => {
  const { used, total } = useHeapSize(2000);
  return <List.Item title="🔧 Heap" subtitle={`${used} / ${total} MB`} />;
};

export default function SearchFilesCommand() {
  const [pattern, setPattern] = useState("");
  const { config } = useConfig();
  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory();
  const lastRecordedRef = useRef<string>("");

  const shouldExecuteSearch = pattern.trim().length >= 3;
  const command = buildGrepCommand(pattern.trim(), {
    path: config.searchPath,
    useRegex: config.useRegex,
    maxResults: config.maxResults,
  });
  const loadingToastRef = useRef<ToastInstance | null>(null);

  const {
    data: grepEntries,
    isLoading,
    pagination,
  } = useGrep(command, {
    execute: shouldExecuteSearch,
    timeout: config.timeout * 1000,
    maxResults: config.maxResults,
    pageSize: 20,
    onStart: (cancel) => {
      toast
        .loading({
          title: "Searching...",
          message: "Press ⌘. to cancel",
          onCancel: cancel,
        })
        .then((t) => {
          loadingToastRef.current = t;
        });
    },
    onLoad: () => {
      loadingToastRef.current?.hide();
      const key = `${pattern.trim()}|${config.useRegex}`;
      if (lastRecordedRef.current === key) return;
      lastRecordedRef.current = key;
      addToHistory({
        pattern: pattern.trim(),
        useRegex: config.useRegex,
      });

      toast.success("Search completed");
    },
    onError: (err) => {
      loadingToastRef.current?.hide();
      toast.error("Search failed", err.message);
    },
    onTimeout: () => {
      loadingToastRef.current?.hide();
      toast.error("Search timed out");
    },
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const locationName = formatLocationName(config.searchPath);
  const placeholderText = config.useRegex
    ? `Regex search in ${locationName}... (${config.timeout}s, max ${config.maxResults})`
    : `Search text in ${locationName}... (${config.timeout}s, max ${config.maxResults})`;
  const shouldShowHistory = !shouldExecuteSearch && history.length > 0;
  const shouldShowEmpty = grepEntries.length === 0 && !isLoading;

  const renderContent = () => {
    if (shouldShowHistory) {
      return (
        <SearchHistoryList
          history={history}
          onSelect={setPattern}
          onRemove={removeFromHistory}
          onClear={clearHistory}
        />
      );
    } else if (shouldShowEmpty) {
      return <EmptyView pattern={pattern} />;
    } else {
      return <GrepResultsList entries={grepEntries} selectedId={Number(selectedId)} />;
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!!grepEntries.length}
      searchText={pattern}
      onSearchTextChange={setPattern}
      searchBarPlaceholder={placeholderText}
      throttle
      pagination={pagination}
      onSelectionChange={handleSelectionChange}
    >
      {IS_DEV && <DebugHeapMonitor />}
      {renderContent()}
    </List>
  );
}
