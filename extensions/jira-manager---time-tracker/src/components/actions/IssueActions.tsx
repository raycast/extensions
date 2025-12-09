import { Action, ActionPanel, getPreferenceValues, Icon, Color } from "@raycast/api";
import { Issue, Preferences } from "../../utils/types";
import { useIssueActions } from "../../hooks/useIssueActions";
import { AddComment } from "../forms/AddComment";
import { ChangeStatus } from "../forms/ChangeStatus";
import { CreateSubtask } from "../forms/CreateSubtask";

interface IssueActionsProps {
  issue: Issue;
  mutate?: () => void;
  activeIssue?: { issueKey: string; isRunning: boolean } | null;
}

export function IssueActions({ issue, mutate, activeIssue }: IssueActionsProps) {
  const preferences = getPreferenceValues<Preferences>();
  const domain = preferences.jiraDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const { handleStartWork, handleAssignToMe, handleToggleWatcher, handlePauseWork } = useIssueActions(mutate);

  const isActive = activeIssue?.issueKey === issue.key && activeIssue.isRunning;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Work & Status">
        {isActive ? (
          <Action
            title="Pause Work"
            icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
            onAction={() => handlePauseWork(issue.key)}
          />
        ) : (
          <Action
            title="Start Work"
            icon="clock.png"
            onAction={() => handleStartWork(issue.key, issue.fields.summary)}
          />
        )}

        <Action.Push
          title="Change Status"
          icon={Icon.ArrowRight}
          target={<ChangeStatus issueKey={issue.key} onTransition={() => mutate?.()} />}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
        <Action
          title="Assign to Me"
          icon={Icon.Person}
          onAction={() => handleAssignToMe(issue.key)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Collaboration">
        <Action.Push
          title="Add Comment"
          icon={Icon.Bubble}
          target={<AddComment issueKey={issue.key} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action.Push
          title="Create Subtask"
          icon={Icon.Plus}
          target={
            <CreateSubtask parentKey={issue.key} projectId={issue.fields.project.id} onCreated={() => mutate?.()} />
          }
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        />
        <Action
          title={issue.fields.watches?.isWatching ? "Stop Watching" : "Start Watching"}
          icon={issue.fields.watches?.isWatching ? Icon.EyeSlash : Icon.Eye}
          onAction={() => handleToggleWatcher(issue.key, !!issue.fields.watches?.isWatching)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Links & Copy">
        <Action.OpenInBrowser url={`https://${domain}/browse/${issue.key}`} />
        <Action.CopyToClipboard content={issue.key} title="Copy Key" />
        <Action.CopyToClipboard content={`https://${domain}/browse/${issue.key}`} title="Copy URL" />
        <Action.CopyToClipboard content={issue.fields.summary} title="Copy Summary" />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
