import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { searchHistory } from "./lib/mcp";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import { summarizeSQL } from "./lib/sql";
import { openQueryDeeplink } from "./lib/deeplink";
import { formatRelativeTime, formatRowCount } from "./lib/format";

export default function SearchHistoryCommand() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const {
    data: results,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (q: string) => searchHistory(q, 100, { signal: abortable.current?.signal }),
    [query],
    { keepPreviousData: true, abortable },
  );

  if (error) {
    return (
      <List>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search query history"
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      {!isLoading && results !== undefined && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching history"
          description={
            query
              ? "Try a different search term."
              : "Run queries in TablePro to build history."
          }
        />
      ) : null}
      {(results ?? []).map((entry) => (
        <List.Item
          key={entry.id}
          title={summarizeSQL(entry.query, 70)}
          subtitle={entry.connectionName}
          accessories={historyAccessories(entry.executedAt, entry.rowCount)}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              {entry.connectionId ? (
                <Action
                  title="Open in TablePro"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    try {
                      await openQueryDeeplink(entry.connectionId!, entry.query);
                    } catch (err) {
                      await showFailureToast(err, {
                        title: "Could not open query",
                      });
                    }
                  }}
                />
              ) : null}
              <Action
                title="Copy SQL"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={async () => {
                  await Clipboard.copy(entry.query);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "SQL copied",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function historyAccessories(
  executedAt: string,
  rowCount: number | undefined,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (rowCount !== undefined) {
    accessories.push({
      tag: `${formatRowCount(rowCount)} rows`,
      tooltip: `${rowCount.toLocaleString()} rows`,
    });
  }
  accessories.push({
    text: formatRelativeTime(executedAt),
    tooltip: new Date(executedAt).toLocaleString(),
  });
  return accessories;
}
