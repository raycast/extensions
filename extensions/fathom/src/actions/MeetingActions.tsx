import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import type { Meeting } from "../types/Types";
import { exportMeeting } from "../utils/export";
import { MeetingSummaryDetail, MeetingTranscriptDetail } from "../search-meetings";
import { MeetingActionItemsDetail } from "../view-action-items";
import { RefreshCacheAction } from "./RefreshCacheAction";

// Shared Copy Actions Section
export function MeetingCopyActions(props: {
  meeting: Meeting;
  additionalContent?: { title: string; content: string; shortcut?: Keyboard.Shortcut };
}) {
  const { meeting, additionalContent } = props;
  const shareUrl = meeting.shareUrl || meeting.url;

  return (
    <ActionPanel.Section title="Copy">
      {additionalContent && (
        <Action.CopyToClipboard
          title={additionalContent.title}
          content={additionalContent.content}
          icon={Icon.Clipboard}
          shortcut={additionalContent.shortcut || { modifiers: ["cmd"], key: "c" }}
        />
      )}
      {shareUrl && (
        <Action.CopyToClipboard
          title="Copy Share Link"
          content={shareUrl}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
      {meeting.calendarInvitees && meeting.calendarInvitees.length > 0 && (
        <Action.CopyToClipboard
          title="Copy Calendar Invitees Emails"
          content={meeting.calendarInvitees.join(", ")}
          icon={Icon.Envelope}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
      )}
    </ActionPanel.Section>
  );
}

// Shared Open Actions Section
export function MeetingOpenActions(props: { meeting: Meeting }) {
  const { meeting } = props;
  const shareUrl = meeting.shareUrl || meeting.url;

  return (
    <ActionPanel.Section title="Open">
      {meeting.url && (
        <Action.OpenInBrowser url={meeting.url} title="Open in Fathom" shortcut={{ modifiers: ["cmd"], key: "o" }} />
      )}
      {shareUrl && shareUrl !== meeting.url && (
        <Action.OpenInBrowser
          url={shareUrl}
          title="Open Share Link"
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      )}
    </ActionPanel.Section>
  );
}

// Shared Export Actions Section
export function MeetingExportActions(props: { meeting: Meeting; recordingId: string }) {
  const { meeting, recordingId } = props;

  return (
    <ActionPanel.Section title="Export">
      <Action
        title="Export Summary as Markdown"
        icon={Icon.Download}
        onAction={() => exportMeeting({ meeting, recordingId, type: "summary", format: "md" })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action
        title="Export Summary as Text"
        icon={Icon.Download}
        onAction={() => exportMeeting({ meeting, recordingId, type: "summary", format: "txt" })}
      />
      <Action
        title="Export Transcript as Markdown"
        icon={Icon.Download}
        onAction={() => exportMeeting({ meeting, recordingId, type: "transcript", format: "md" })}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
      />
      <Action
        title="Export Transcript as Text"
        icon={Icon.Download}
        onAction={() => exportMeeting({ meeting, recordingId, type: "transcript", format: "txt" })}
      />
    </ActionPanel.Section>
  );
}

// Detail View Actions (for when viewing a specific detail)
export function MeetingDetailActions(props: {
  meeting: Meeting;
  recordingId: string;
  currentView: "summary" | "transcript" | "actionItems";
  additionalContent?: { title: string; content: string; shortcut?: Keyboard.Shortcut };
}) {
  const { meeting, recordingId, currentView, additionalContent } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="View">
        {currentView !== "actionItems" && (
          <Action.Push
            title="View Action Items"
            icon={Icon.CheckCircle}
            target={<MeetingActionItemsDetail meeting={meeting} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        )}
        {currentView !== "transcript" && (
          <Action.Push
            title="View Transcript"
            icon={Icon.Text}
            target={<MeetingTranscriptDetail meeting={meeting} recordingId={recordingId} />}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        )}
        {currentView !== "summary" && (
          <Action.Push
            title="View Summary"
            icon={Icon.Document}
            target={<MeetingSummaryDetail meeting={meeting} recordingId={recordingId} />}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        )}
      </ActionPanel.Section>

      <MeetingCopyActions meeting={meeting} additionalContent={additionalContent} />
      <MeetingOpenActions meeting={meeting} />
      <MeetingExportActions meeting={meeting} recordingId={recordingId} />
    </ActionPanel>
  );
}

// Main Meeting Actions (for list view)
export function MeetingActions(props: { meeting: Meeting; onRefresh?: () => Promise<void> }) {
  const { meeting, onRefresh } = props;
  const recordingId = meeting.recordingId ?? meeting.id;

  return (
    <ActionPanel>
      <ActionPanel.Section title="View">
        <Action.Push
          title="View Summary"
          icon={Icon.Document}
          target={<MeetingSummaryDetail meeting={meeting} recordingId={recordingId} />}
        />
        <Action.Push
          title="View Action Items"
          icon={Icon.CheckCircle}
          target={<MeetingActionItemsDetail meeting={meeting} />}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />
        <Action.Push
          title="View Transcript"
          icon={Icon.Text}
          target={<MeetingTranscriptDetail meeting={meeting} recordingId={recordingId} />}
        />
      </ActionPanel.Section>

      <MeetingCopyActions meeting={meeting} />
      <MeetingOpenActions meeting={meeting} />
      <MeetingExportActions meeting={meeting} recordingId={recordingId} />

      {onRefresh && (
        <ActionPanel.Section>
          <RefreshCacheAction onRefresh={onRefresh} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
