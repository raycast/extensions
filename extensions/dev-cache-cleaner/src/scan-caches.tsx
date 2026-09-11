import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  Clipboard,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { CATEGORY_META } from "./types";
import type { ScanCategory, ScanResult } from "./types";
import { scanAll } from "./scanners";
import { cleanResult, cleanAllSafe } from "./utils/cleaner";
import { formatBytes } from "./utils/disk";
import { buildDetailMarkdown } from "./utils/format";
import { setCachedResults } from "./utils/cache-store";

export default function ScanCaches() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning caches..." });

    try {
      const scanResults = await scanAll((step) => {
        toast.message = step;
      });
      setResults(scanResults);
      await setCachedResults(scanResults);
      const totalSize = scanResults.reduce((sum, r) => sum + r.size, 0);
      toast.style = Toast.Style.Success;
      toast.title = `Found ${formatBytes(totalSize)} reclaimable`;
      toast.message = `${scanResults.length} items across ${new Set(scanResults.map((r) => r.category)).size} categories`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Scan failed";
      toast.message = error instanceof Error ? error.message : undefined;
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const filtered = results.filter((r) => {
    if (filter === "safe" && r.risk !== "safe") return false;
    if (filter === "large" && r.size < 1024 * 1024 * 1024) return false;
    if (filter !== "all" && filter !== "safe" && filter !== "large" && r.category !== filter) return false;
    return true;
  });

  const grouped = new Map<ScanCategory, ScanResult[]>();
  for (const r of filtered) {
    const list = grouped.get(r.category) ?? [];
    list.push(r);
    grouped.set(r.category, list);
  }

  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const safeSize = results.filter((r) => r.risk === "safe").reduce((sum, r) => sum + r.size, 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={`Search caches... (${formatBytes(totalSize)} total, ${formatBytes(safeSize)} safe)`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={setFilter}>
          <List.Dropdown.Section title="Risk">
            <List.Dropdown.Item title={`All (${results.length})`} value="all" />
            <List.Dropdown.Item title={`Safe Only (${results.filter((r) => r.risk === "safe").length})`} value="safe" />
            <List.Dropdown.Item
              title={`Large > 1GB (${results.filter((r) => r.size >= 1024 ** 3).length})`}
              value="large"
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Category">
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = results.filter((r) => r.category === key).length;
              if (count === 0) return null;
              return <List.Dropdown.Item key={key} title={`${meta.title} (${count})`} value={key} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Array.from(grouped.entries()).map(([category, items]) => {
        const catSize = items.reduce((sum, r) => sum + r.size, 0);
        return (
          <List.Section
            key={category}
            title={CATEGORY_META[category].title}
            subtitle={`${items.length} items — ${formatBytes(catSize)}`}
          >
            {items.map((result) => (
              <ResultItem key={result.id} result={result} allResults={results} onUpdate={loadResults} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function ResultItem({
  result,
  allResults,
  onUpdate,
}: {
  result: ScanResult;
  allResults: ScanResult[];
  onUpdate: () => void;
}) {
  const icon =
    result.risk === "safe"
      ? { source: Icon.CircleFilled, tintColor: Color.Green }
      : { source: Icon.CircleFilled, tintColor: Color.Orange };

  return (
    <List.Item
      title={result.title}
      icon={icon}
      accessories={[{ text: formatBytes(result.size) }]}
      detail={<List.Item.Detail markdown={buildDetailMarkdown(result)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`Clean ${result.title}`}
              icon={Icon.Trash}
              style={result.risk === "moderate" ? Action.Style.Destructive : Action.Style.Regular}
              onAction={async () => {
                if (result.risk === "moderate") {
                  const confirmed = await confirmAlert({
                    title: `Clean "${result.title}"?`,
                    message: "This item is marked for review. Some data may not be recoverable.",
                    primaryAction: { title: "Clean", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                }
                const freed = await cleanResult(result);
                if (freed > 0) {
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Cleaned ${result.title}`,
                    message: `Freed ${formatBytes(freed)}`,
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: `Could not clean ${result.title}`,
                    message: result.requiresTool
                      ? `Requires ${result.requiresTool}`
                      : "Command failed or nothing to clean",
                  });
                }
                onUpdate();
              }}
            />
            <Action
              title="Clean All Safe"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                const safeResults = allResults.filter((r) => r.risk === "safe" && r.available && r.size > 0);
                const safeTotal = safeResults.reduce((sum, r) => sum + r.size, 0);
                const confirmed = await confirmAlert({
                  title: `Clean ${safeResults.length} Safe Items?`,
                  message: `This will free approximately ${formatBytes(safeTotal)}.`,
                  primaryAction: { title: "Clean All Safe" },
                });
                if (!confirmed) return;
                const freed = await cleanAllSafe(allResults);
                await showToast({
                  style: Toast.Style.Success,
                  title: "All safe caches cleaned",
                  message: `Freed ${formatBytes(freed)}`,
                });
                onUpdate();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Copy Clean Command"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(result.cleanCommand);
                await showToast({ title: "Copied", message: result.cleanCommand });
              }}
            />
            {result.path.startsWith("/") || result.path.startsWith("~") ? (
              <Action
                title="Open in Finder"
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => open(result.path)}
              />
            ) : null}
            <Action
              title="Rescan"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onUpdate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
