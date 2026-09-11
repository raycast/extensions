import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { clearHistory, getHistory, HistoryEntry, removeFromHistory } from "./lib/history";

function scoreText(entry: HistoryEntry): string {
  return entry.score === null ? "Score unavailable" : `${entry.score}/100`;
}

export default function ViewHistory() {
  const { data: history = [], isLoading, revalidate } = useCachedPromise(getHistory, []);

  async function removeEntry(entry: HistoryEntry) {
    const confirmed = await confirmAlert({
      title: "Remove Report from History?",
      message: `${entry.displayTarget} will no longer appear in local history.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await removeFromHistory(entry.target);
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Removed from history" });
  }

  async function removeAll() {
    const confirmed = await confirmAlert({
      title: "Clear Report History?",
      message: "This removes all locally saved Is Agentic report entries.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await clearHistory();
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search previously viewed websites">
      {history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Report History"
          description="Reports you view in Check Agent Readiness are saved here locally."
        />
      ) : (
        history.map((entry) => (
          <List.Item
            key={entry.target}
            icon={Icon.Clock}
            title={entry.displayTarget}
            subtitle={entry.scoreLabel}
            accessories={[
              { text: scoreText(entry) },
              { date: new Date(entry.viewedAt) },
              { tag: `${entry.issueCount} issue${entry.issueCount === 1 ? "" : "s"}` },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Full Report" url={entry.reportUrl} />
                <Action.CopyToClipboard title="Copy Website URL" content={entry.target} />
                <Action.CopyToClipboard title="Copy Report URL" content={entry.reportUrl} />
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeEntry(entry)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={removeAll}
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
