import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { Meeting, ActionItem } from "./types/Types";
import { MeetingCopyActions, MeetingOpenActions } from "./actions/MeetingActions";
import { useTeamColor } from "./hooks/useTeamColor";

export function ActionItemDetail({ item, meeting }: { item: ActionItem; meeting: Meeting }) {
  const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";
  const teamColor = useTeamColor(item.assignee.team);

  // Build markdown for the action item (just the description)
  const markdown = `# ${item.description.trim()}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Action Item"
      actions={
        <ActionPanel>
          {item.recordingPlaybackUrl && (
            <Action.OpenInBrowser
              title="Jump to Timestamp"
              url={item.recordingPlaybackUrl}
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Description"
            content={item.description}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <MeetingCopyActions meeting={meeting} />
          <MeetingOpenActions meeting={meeting} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={item.completed ? "✅ Completed" : "⭕ Pending"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Assigned to" text={assigneeText} />
          {item.assignee.team && (
            <Detail.Metadata.TagList title="Team">
              <Detail.Metadata.TagList.Item text={item.assignee.team} color={teamColor || "#007AFF"} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {item.recordingPlaybackUrl ? (
            <Detail.Metadata.Link title="Timestamp" text={item.recordingTimestamp} target={item.recordingPlaybackUrl} />
          ) : (
            <Detail.Metadata.Label title="Timestamp" text={item.recordingTimestamp} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Source" text={item.userGenerated ? "User-generated" : "AI-generated"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Meeting" text={meeting.title} />
          {meeting.createdAt && (
            <Detail.Metadata.Label
              title="Date"
              text={new Date(meeting.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          )}
        </Detail.Metadata>
      }
    />
  );
}
