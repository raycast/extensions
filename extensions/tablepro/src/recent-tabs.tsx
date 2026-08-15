import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { RecentTab } from "./lib/types";
import { listRecentTabs, openConnectionWindow } from "./lib/mcp";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import { openTableDeeplink } from "./lib/deeplink";
import { formatRelativeTime } from "./lib/format";

export default function RecentTabsCommand() {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: tabs,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    () => listRecentTabs({ signal: abortable.current?.signal }),
    [],
    { keepPreviousData: true, abortable },
  );

  useEffect(() => {
    if (!error) return;
    if (tabs === undefined) return;
    const scenario = classifyError(error);
    if (scenario.kind !== "other") return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh tabs",
        message: scenario.message,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [error, tabs]);

  if (error && tabs === undefined) {
    return (
      <List>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter recent tabs"
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
      {!isLoading && tabs !== undefined && tabs.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent tabs"
          description="Open a tab in TablePro to see it here."
        />
      ) : null}
      {(tabs ?? []).map((tab) => (
        <List.Item
          key={tab.id}
          title={tab.title}
          subtitle={tabSubtitle(tab)}
          icon={tabIcon(tab)}
          accessories={tabAccessories(tab)}
          actions={
            <ActionPanel>
              <Action
                title="Open in TablePro"
                icon={Icon.AppWindow}
                onAction={async () => {
                  try {
                    if (tab.tableName) {
                      await openTableDeeplink(
                        tab.connectionId,
                        tab.tableName,
                        tab.databaseName,
                        tab.schemaName,
                      );
                    } else {
                      await openConnectionWindow(tab.connectionId);
                    }
                  } catch (err) {
                    await showFailureToast(err, {
                      title: "Could not open tab",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function tabSubtitle(tab: RecentTab): string {
  const parts = [tab.connectionName, tab.databaseName, tab.schemaName].filter(
    (value): value is string => Boolean(value),
  );
  return parts.join(" / ");
}

function tabAccessories(tab: RecentTab): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [{ tag: tabTypeLabel(tab) }];
  if (tab.updatedAt) {
    accessories.push({
      text: formatRelativeTime(tab.updatedAt),
      tooltip: new Date(tab.updatedAt).toLocaleString(),
    });
  }
  return accessories;
}

function tabIcon(tab: RecentTab): Icon {
  switch (tab.tabType) {
    case "query":
      return Icon.Terminal;
    case "table":
      return Icon.List;
    case "structure":
      return Icon.Code;
    default:
      return Icon.Document;
  }
}

function tabTypeLabel(tab: RecentTab): string {
  switch (tab.tabType) {
    case "query":
      return "Query";
    case "table":
      return "Table";
    case "structure":
      return "Structure";
    default:
      return "Tab";
  }
}
