import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  getAllItems,
  getBookmarks,
  getHistory,
  getOpenTabs,
  openUrlInTabbit,
  switchToTab,
  type TabbitItem,
} from "./tabbit";

type Source = "tabs" | "history" | "bookmarks" | "all";

type Props = {
  source: Source;
};

const sourceLoaders: Record<Source, () => Promise<TabbitItem[]>> = {
  tabs: getOpenTabs,
  history: getHistory,
  bookmarks: getBookmarks,
  all: getAllItems,
};

const sourceTitles: Record<Source, string> = {
  tabs: "No Open Tabs",
  history: "No History",
  bookmarks: "No Bookmarks",
  all: "No Results",
};

export function SearchList({ source }: Props) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    sourceLoaders[source],
  );
  const items = data || [];

  useEffect(() => {
    if (!error) {
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Could not load Tabbit data",
      message: error.message,
    });
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Tabbit..."
      filtering
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title={sourceTitles[source]}
        description={error?.message}
      />
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={iconForItem(item)}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ text: labelForItem(item) }]}
          actions={<ItemActions item={item} revalidate={revalidate} />}
        />
      ))}
    </List>
  );
}

function ItemActions({
  item,
  revalidate,
}: {
  item: TabbitItem;
  revalidate: () => void | Promise<TabbitItem[]>;
}) {
  const canSwitchToTab =
    item.type === "tab" && item.windowIndex && item.tabIndex;

  return (
    <ActionPanel>
      {canSwitchToTab ? (
        <Action
          title="Switch to Tab"
          icon={Icon.ArrowRight}
          onAction={async () => {
            await switchToTab(item.windowIndex!, item.tabIndex!);
          }}
        />
      ) : (
        <Action
          title="Open in Tabbit"
          icon={Icon.Globe}
          onAction={async () => {
            await openUrlInTabbit(item.url);
          }}
        />
      )}
      <Action
        title="Open URL in Tabbit"
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={async () => {
          await openUrlInTabbit(item.url);
        }}
      />
      <Action.CopyToClipboard
        title="Copy URL"
        content={item.url}
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

function iconForItem(item: TabbitItem) {
  if (item.type === "tab") {
    return Icon.Window;
  }

  if (item.type === "bookmark") {
    return Icon.Bookmark;
  }

  return Icon.Clock;
}

function labelForItem(item: TabbitItem) {
  if (item.type === "tab") {
    return "Tab";
  }

  if (item.type === "bookmark") {
    return "Bookmark";
  }

  return "History";
}
