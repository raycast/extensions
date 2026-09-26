import { Action, ActionPanel, Alert, Clipboard, Icon, Toast, confirmAlert, showToast } from "@raycast/api";

import { cancelMeeting } from "../api/meetings";
import { Invitee, ScheduledEvent } from "../api/types";

function meetingUrl(meeting: ScheduledEvent) {
  const location = meeting.location;
  if (location?.join_url) return location.join_url;
  if (location?.location?.startsWith("http")) return location.location;
  return undefined;
}

interface MeetingActionsProps {
  meeting: ScheduledEvent;
  invitee?: Invitee;
  onCanceled: () => void;
}

export function MeetingActions({ meeting, invitee, onCanceled }: MeetingActionsProps) {
  const joinUrl = meetingUrl(meeting);

  async function handleCancel() {
    const confirmed = await confirmAlert({
      title: `Cancel ${meeting.name}?`,
      message: invitee ? `This will notify ${invitee.name}.` : "Calendly will notify the meeting invitees.",
      primaryAction: { title: "Cancel Meeting", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast(Toast.Style.Animated, "Canceling meeting…");
    try {
      await cancelMeeting(meeting.uri);
      toast.style = Toast.Style.Success;
      toast.title = "Meeting canceled";
      onCanceled();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not cancel meeting";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <ActionPanel>
      {joinUrl ? <Action.OpenInBrowser title="Join Meeting" icon={Icon.Video} url={joinUrl} /> : null}
      {joinUrl ? (
        <Action title="Copy Meeting Link" icon={Icon.Clipboard} onAction={() => Clipboard.copy(joinUrl)} />
      ) : null}
      {invitee ? <Action.CopyToClipboard title="Copy Invitee Email" content={invitee.email} /> : null}

      <ActionPanel.Section>
        {invitee?.reschedule_url ? (
          <Action.OpenInBrowser title="Reschedule Meeting" icon={Icon.ArrowClockwise} url={invitee.reschedule_url} />
        ) : null}
        <Action title="Cancel Meeting" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleCancel} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
