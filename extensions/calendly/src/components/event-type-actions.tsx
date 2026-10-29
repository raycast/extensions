import { Action, ActionPanel, Clipboard, Icon, Toast, showToast } from "@raycast/api";

import { createSingleUseLink, listAvailableTimes } from "../api/event-types";
import { EventType } from "../api/types";
import { endOfRange, formatDateTime } from "../lib/dates";
import { BookMeetingForm } from "../book-meeting";

function availabilityMessage(eventType: EventType, times: string[]) {
  const bullets = times.map((time) => `• ${formatDateTime(time)}`).join("\n");
  return `I'm available at:\n\n${bullets}\n\nOr you can pick another time here:\n${eventType.scheduling_url}`;
}

export function EventTypeActions({ eventType }: { eventType: EventType }) {
  async function copyAvailableTimes() {
    const toast = await showToast(Toast.Style.Animated, "Finding available times…");
    try {
      const start = new Date();
      const times = await listAvailableTimes(eventType.uri, start, endOfRange(start, 7));
      const available = times.filter((time) => time.status === "available").slice(0, 5);
      if (available.length === 0) throw new Error("No available times found in the next 7 days.");
      await Clipboard.copy(
        availabilityMessage(
          eventType,
          available.map((time) => time.start_time),
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Copied available times";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not copy availability";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  async function copySingleUseLink() {
    const toast = await showToast(Toast.Style.Animated, "Creating single-use link…");
    try {
      const link = await createSingleUseLink(eventType.uri);
      await Clipboard.copy(link.booking_url);
      toast.style = Toast.Style.Success;
      toast.title = "Copied single-use link";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create link";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Scheduling Link" icon={Icon.Clipboard} content={eventType.scheduling_url} />
      <Action.OpenInBrowser title="Open Scheduling Page" url={eventType.scheduling_url} />
      <Action title="Copy Next Available Times" icon={Icon.Clock} onAction={copyAvailableTimes} />

      <ActionPanel.Section>
        <Action title="Create Single-Use Link" icon={Icon.Link} onAction={copySingleUseLink} />
        <Action.Push
          title="Book Meeting"
          icon={Icon.Calendar}
          target={<BookMeetingForm eventTypeUri={eventType.uri} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
