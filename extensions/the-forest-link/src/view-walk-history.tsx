import { URL } from "node:url";

import { Action, ActionPanel, Alert, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { clearWalkHistory, getWalkHistory, WalkHistoryEntry } from "./walk-history";

function getDisplayName(entry: WalkHistoryEntry) {
  try {
    return new URL(entry.url).hostname.replace(/^www\./, "");
  } catch {
    return entry.url;
  }
}

export default function Command() {
  const { data: history = [], isLoading, revalidate } = useCachedPromise(getWalkHistory);

  async function clearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear walk history?",
      message: `This will permanently remove ${history.length} saved ${history.length === 1 ? "walk" : "walks"}.`,
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    await clearWalkHistory();
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Walk history cleared" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search past walks…">
      {!isLoading && history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Leaf}
          title="No Walks Yet"
          description="Use Go for a Walk to discover a site and save it here."
        />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.id}
            icon={Icon.Globe}
            title={getDisplayName(entry)}
            subtitle={entry.url}
            accessories={[{ date: new Date(entry.walkedAt) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={entry.url} />
                <Action.CopyToClipboard title="Copy Website URL" content={entry.url} />
                <ActionPanel.Section>
                  <Action
                    title="Clear Walk History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={clearHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
