import { Action, ActionPanel, Alert, Icon, Keyboard, List, confirmAlert, getPreferenceValues, trash } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { dateLabel } from "./lib/format";

type RecentIssue = { id: string; title: string; updatedAt: Date; attachmentPath: string };

async function loadRecent(workspace: string): Promise<RecentIssue[]> {
  const response = await fetch(`https://api.acme-tracker.test/${encodeURIComponent(workspace)}/recent`);
  if (!response.ok) throw new Error(`Acme returned ${response.status}`);
  const issues = (await response.json()) as (Omit<RecentIssue, "updatedAt"> & { updatedAt: string })[];
  return issues.map((issue) => ({ ...issue, updatedAt: new Date(issue.updatedAt) }));
}

export default function Command() {
  const { workspace } = getPreferenceValues<Preferences.RecentIssues>();
  const { data, isLoading, error, revalidate } = useCachedPromise(loadRecent, [workspace]);

  async function deleteAttachment(issue: RecentIssue) {
    const confirmed = await confirmAlert({
      title: "Move Attachment to Trash?",
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(issue.attachmentPath);
    } catch (failure) {
      await showFailureToast(failure, { title: "Could not move attachment to Trash" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent issues…">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load issues"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        data?.map((issue) => (
          <List.Item
            key={issue.id}
            title={issue.title}
            accessories={[{ text: dateLabel(issue.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Title" content={issue.title} />
                <ActionPanel.Submenu title="Set Priority" icon={Icon.Flag}>
                  <Action title="Low" onAction={revalidate} />
                  <Action title="High" onAction={revalidate} />
                </ActionPanel.Submenu>
                <Action
                  title="Move Attachment to Trash"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => deleteAttachment(issue)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
