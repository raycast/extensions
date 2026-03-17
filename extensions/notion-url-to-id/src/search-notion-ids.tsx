import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import {
  getHistoryEntries,
  markHistoryEntryCopied,
  NotionIdHistoryEntry,
  togglePinnedHistoryEntry,
} from "./lib/history";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function entryAccessories(entry: NotionIdHistoryEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: formatDate(entry.lastCopiedAt),
        color: Color.SecondaryText,
      },
      tooltip: `Last copied ${new Date(entry.lastCopiedAt).toLocaleString()}`,
    },
  ];

  if (entry.pinned) {
    accessories.unshift({
      tag: {
        value: "Pinned",
        color: Color.Yellow,
      },
      tooltip: "Pinned",
    });
  }

  return accessories;
}

export default function Command() {
  const [entries, setEntries] = useState<NotionIdHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await getHistoryEntries());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleTogglePin = useCallback(async (entry: NotionIdHistoryEntry) => {
    const updatedEntries = await togglePinnedHistoryEntry(entry.notionId);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: entry.pinned ? `Unpinned ${entry.notionId}` : `Pinned ${entry.notionId}`,
    });
  }, []);

  const handleCopy = useCallback(async (entry: NotionIdHistoryEntry) => {
    const updatedEntries = await markHistoryEntryCopied(entry.notionId);
    setEntries(updatedEntries);

    await showToast({
      style: Toast.Style.Success,
      title: `Successfully copied ${entry.notionId}`,
    });
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Notion IDs"
      searchBarPlaceholder="Search by page name or Notion ID"
      filtering={{ keepSectionOrder: true }}
    >
      {entries.length === 0 ? (
        <List.EmptyView
          title="No copied Notion IDs yet"
          description="Run Extract Notion ID first and successful copies will appear here."
        />
      ) : null}

      {entries.map((entry) => (
        <List.Item
          key={entry.notionId}
          id={entry.notionId}
          icon={{
            source: entry.pinned ? Icon.Star : Icon.Bookmark,
            tintColor: entry.pinned ? Color.Yellow : Color.SecondaryText,
          }}
          title={entry.pageName}
          subtitle={entry.notionId}
          keywords={[entry.notionId, entry.pageName, entry.sourceUrl ?? ""]}
          accessories={entryAccessories(entry)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Notion ID"
                content={entry.notionId}
                onCopy={() => handleCopy(entry)}
              />
              <Action
                title={entry.pinned ? "Unpin Notion ID" : "Pin Notion ID"}
                icon={entry.pinned ? Icon.StarDisabled : Icon.Star}
                onAction={() => handleTogglePin(entry)}
              />
              {entry.sourceUrl ? (
                <Action.OpenInBrowser title="Open Source URL" url={entry.sourceUrl} icon={Icon.Globe} />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
