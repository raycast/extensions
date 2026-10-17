import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import type { Meeting, ActionItem } from "../types/Types";
import { MeetingCopyActions, MeetingOpenActions } from "./MeetingActions";
import { ActionItemDetail } from "../view-action-item-detail";

export function ActionItemActions({
  item,
  meeting,
  allItemsCopyContent,
}: {
  item: ActionItem;
  meeting: Meeting;
  allItemsCopyContent: string;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="View">
        <Action.Push
          title="View Details"
          icon={Icon.Document}
          target={<ActionItemDetail item={item} meeting={meeting} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Actions">
        {item.recordingPlaybackUrl && (
          <Action.OpenInBrowser title="Jump to Timestamp" url={item.recordingPlaybackUrl} icon={Icon.Play} />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Action Item"
          content={item.description}
          icon={Icon.Clipboard}
          // Common.Copy is ⌘⇧C, which Copy Share Link (Common.CopyDeeplink) also
          // resolves to in this panel. ⌘C matches Copy Summary / Copy Transcript.
          shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
        />
        <Action.CopyToClipboard
          title="Copy All Action Items"
          content={allItemsCopyContent}
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>

      <MeetingCopyActions meeting={meeting} />
      <MeetingOpenActions meeting={meeting} />
    </ActionPanel>
  );
}
