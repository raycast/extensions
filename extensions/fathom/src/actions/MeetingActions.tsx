import {
  Action,
  ActionPanel,
  closeMainWindow,
  getApplications,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  showHUD,
} from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { useState, useEffect } from "react";
import type { Meeting } from "../types/Types";
import { exportMeeting } from "../utils/export";
import { MeetingSummaryDetail, MeetingTranscriptDetail } from "../search-meetings";
import { MeetingActionItemsDetail } from "../view-action-items";
import { MeetingDownloadActions } from "./DownloadActions";
import { RefreshCacheAction } from "./RefreshCacheAction";
import { cacheManager } from "../utils/cacheManager";

function useFetchingBackground() {
  const [isFetching, setIsFetching] = useState(() => cacheManager.isFetchingBackground());
  useEffect(() => {
    return cacheManager.subscribeFetching(setIsFetching);
  }, []);
  return isFetching;
}

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
          shortcut={additionalContent.shortcut || Keyboard.Shortcut.Common.Copy}
        />
      )}
      {shareUrl && (
        <Action.CopyToClipboard
          title="Copy Share Link"
          content={shareUrl}
          icon={Icon.Link}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          onCopy={() => showHUD("Share Link Copied")}
        />
      )}
      {meeting.calendarInvitees && meeting.calendarInvitees.length > 0 && (
        <Action.CopyToClipboard
          title="Copy Calendar Invitees Emails"
          content={meeting.calendarInvitees.join(", ")}
          icon={Icon.Envelope}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "e" },
            Windows: { modifiers: ["ctrl", "shift"], key: "e" },
          }}
        />
      )}
    </ActionPanel.Section>
  );
}

/** Bundle ID of the Fathom desktop app, which registers the `fathom://` scheme. */
const FATHOM_DESKTOP_BUNDLE_ID = "video.fathom.electron";

/**
 * Where "Open in Fathom" should go: the desktop app's deep link when the user prefers it
 * and the app is installed, otherwise the web URL. The deep link takes the CALL id from
 * the web URL (`/calls/<id>`), which is not the recording id.
 */
async function meetingOpenTarget(webUrl: string): Promise<string> {
  const callId = /\/calls\/(\d+)/.exec(webUrl)?.[1];
  if (getPreferenceValues<Preferences>().openMeetingsIn !== "desktop" || !callId) return webUrl;
  // A failed app scan falls back to the web rather than failing the action.
  const apps = await getApplications().catch(() => []);
  if (!apps.some((app) => app.bundleId === FATHOM_DESKTOP_BUNDLE_ID)) return webUrl;
  // The same link fathom.video's "open in desktop app" page hands the app.
  return `fathom://open-window/desktop_app/pages/calls/${callId}/details?fathomName=calls&roundedCorners=true`;
}

// Shared Open Actions Section
export function MeetingOpenActions(props: { meeting: Meeting }) {
  const { meeting } = props;
  const shareUrl = meeting.shareUrl || meeting.url;

  return (
    <ActionPanel.Section title="Open">
      {meeting.url && (
        <Action
          title="Open in Fathom"
          icon={Icon.ArrowNe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              await open(await meetingOpenTarget(meeting.url));
              await closeMainWindow();
            } catch (error) {
              await showError(error, { title: "Could Not Open Meeting" });
            }
          }}
        />
      )}
      {shareUrl && shareUrl !== meeting.url && (
        <Action.OpenInBrowser url={shareUrl} title="Open Share Link" shortcut={Keyboard.Shortcut.Common.OpenWith} />
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
        // ⌘⇧S would collide with Common.Duplicate, and this action duplicates
        // nothing — it writes a file. ⌘⇧M ("Markdown") is unclaimed and pairs
        // with ⌘⇧T for the transcript export below.
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "m" },
          Windows: { modifiers: ["ctrl", "shift"], key: "m" },
        }}
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
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "t" },
          Windows: { modifiers: ["ctrl", "shift"], key: "t" },
        }}
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
            shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
          />
        )}
        {currentView !== "transcript" && (
          <Action.Push
            title="View Transcript"
            icon={Icon.Text}
            target={<MeetingTranscriptDetail meeting={meeting} recordingId={recordingId} />}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "t" }, Windows: { modifiers: ["ctrl"], key: "t" } }}
          />
        )}
        {currentView !== "summary" && (
          <Action.Push
            title="View Summary"
            icon={Icon.Document}
            target={<MeetingSummaryDetail meeting={meeting} recordingId={recordingId} />}
            // No shortcut: ⌘S is Common.Save and ⌘Y is Common.ToggleQuickLook,
            // neither of which means "view the summary". Borrowing an unrelated
            // Common binding to silence the linter would teach the wrong muscle
            // memory; the action stays reachable from the panel and via search.
          />
        )}
      </ActionPanel.Section>

      <MeetingCopyActions meeting={meeting} additionalContent={additionalContent} />
      <MeetingOpenActions meeting={meeting} />
      <MeetingExportActions meeting={meeting} recordingId={recordingId} />
      <MeetingDownloadActions meeting={meeting} recordingId={recordingId} />
    </ActionPanel>
  );
}

// Main Meeting Actions (for list view)
export function MeetingActions(props: { meeting: Meeting; onRefresh?: () => Promise<void> }) {
  const { meeting, onRefresh } = props;
  const recordingId = meeting.recordingId ?? meeting.id;
  const isFetchingBackground = useFetchingBackground();

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
          shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
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
      <MeetingDownloadActions meeting={meeting} recordingId={recordingId} />

      {onRefresh && (
        <ActionPanel.Section>
          <RefreshCacheAction
            onRefresh={onRefresh}
            onStop={() => cacheManager.stopBackgroundFetch()}
            isFetchingBackground={isFetchingBackground}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
