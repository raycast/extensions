import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, useNavigation } from "@raycast/api";

import { deleteIssue, updateIssue } from "../issue-data";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, Issue, IssueLabel, PRIORITY_CONFIG, STATUS_CONFIG } from "../issue-types";
import { IssueForm } from "./issue-form";
import { LabelForm } from "./label-form";

interface IssueActionsProps {
  issue: Issue;
  labels: IssueLabel[];
  onRefresh: () => void;
  onCreateNew: () => void;
  onToggleDetail: () => void;
}

export function IssueActions({ issue, labels, onRefresh, onCreateNew, onToggleDetail }: IssueActionsProps) {
  const { push } = useNavigation();

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: `Delete ${issue.id}?`,
      message: `"${issue.title}" will be permanently deleted.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      deleteIssue(issue.id);
      onRefresh();
    }
  }

  return (
    <ActionPanel title={`${issue.id} · ${issue.title}`}>
      <ActionPanel.Section>
        <Action
          title="Edit Issue"
          icon={Icon.Pencil}
          onAction={() => push(<IssueForm issue={issue} onSave={onRefresh} />)}
        />
        <Action
          title="Create New Issue"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={onCreateNew}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Set Status">
        {ISSUE_STATUSES.map((s) => (
          <Action
            key={s}
            title={STATUS_CONFIG[s].label}
            icon={
              issue.status === s
                ? { source: Icon.Checkmark, tintColor: STATUS_CONFIG[s].icon.tintColor }
                : STATUS_CONFIG[s].icon
            }
            onAction={() => {
              updateIssue(issue.id, { status: s });
              onRefresh();
            }}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Set Priority">
        {ISSUE_PRIORITIES.map((p) => (
          <Action
            key={p}
            title={PRIORITY_CONFIG[p].label}
            icon={
              issue.priority === p
                ? { source: Icon.Checkmark, tintColor: PRIORITY_CONFIG[p].icon.tintColor }
                : PRIORITY_CONFIG[p].icon
            }
            onAction={() => {
              updateIssue(issue.id, { priority: p });
              onRefresh();
            }}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Labels">
        {labels.map((label) => (
          <Action
            key={label.name}
            title={issue.labels.includes(label.name) ? `Remove "${label.name}"` : `Add "${label.name}"`}
            icon={issue.labels.includes(label.name) ? Icon.Minus : Icon.Plus}
            onAction={() => {
              const newLabels = issue.labels.includes(label.name)
                ? issue.labels.filter((l) => l !== label.name)
                : [...issue.labels, label.name];
              updateIssue(issue.id, { labels: newLabels });
              onRefresh();
            }}
          />
        ))}
        <Action title="Create New Label…" icon={Icon.Tag} onAction={() => push(<LabelForm onSave={onRefresh} />)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action title="Toggle Detail" icon={Icon.Eye} onAction={onToggleDetail} />
        <Action
          title="Copy Issue ID"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          onAction={() => void Clipboard.copy(issue.id)}
        />
        <Action
          title="Delete Issue"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={() => void handleDelete()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
