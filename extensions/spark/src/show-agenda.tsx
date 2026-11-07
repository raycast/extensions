import { Action, ActionPanel, Color, Image, Keyboard, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import ComposeForm from "./components/ComposeForm";
import ErrorView from "./components/ErrorView";
import EventForm from "./components/EventForm";
import MeetingView from "./components/MeetingView";
import { RsvpStatus, rsvp } from "./lib/calendar";
import { heading, untrusted } from "./lib/markdown";
import { awaitsAnswer, dayLabel, startLabel, timeLabel } from "./lib/events";
import { sparkJSON } from "./lib/spark";
import { actionIcon, conferenceIcon, sparkIcon } from "./lib/sparkIcons";
import { AttendeeStatus, CalendarEvent, EventsResult, displayName, formatAddress, toDate } from "./lib/types";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

const RANGES = [
  { id: "today", title: "Today", args: [] as string[] },
  { id: "tomorrow", title: "Tomorrow", args: ["--tomorrow"] },
  { id: "week", title: "This Week", args: ["--week"] },
];

function Command() {
  const [rangeId, setRangeId] = useCachedState("agenda-range", "today");
  const [showingDetail, setShowingDetail] = useCachedState("agenda-detail", false);
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[0];
  const {
    data: events = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(async (args: string[]) => (await sparkJSON<EventsResult>(["events", ...args])).events, [range.args], {
    onError: () => undefined,
  });

  const days = [...new Set(events.map((e) => dayLabel(toDate(e.start))))];

  useRefreshNotice(error, events.length > 0, revalidate);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && events.length > 0}
      searchBarPlaceholder="Filter events"
      searchBarAccessory={
        <List.Dropdown tooltip="Range" value={range.id} onChange={setRangeId}>
          {RANGES.map((r) => (
            <List.Dropdown.Item key={r.id} value={r.id} title={r.title} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={sparkIcon("Calendar", Color.SecondaryText)}
          title={range.id === "today" ? "Nothing else today" : "No events"}
          actions={
            <ActionPanel>
              <Action.Push title="New Event" icon={actionIcon("AddNewEvent")} target={<EventForm />} />
            </ActionPanel>
          }
        />
      )}
      {days.map((day) => (
        <List.Section key={day} title={day}>
          {events
            .filter((e) => dayLabel(toDate(e.start)) === day)
            .map((event) => (
              <List.Item
                key={event.id}
                icon={eventIcon(event)}
                title={event.title ?? "(no title)"}
                keywords={[event.calendar?.title ?? "", event.location ?? "", ...event.attendees.map(displayName)]}
                accessories={[
                  ...(showingDetail ? [] : eventAccessories(event)),
                  // The time sits at the end of the row, so times line up: the
                  // full range when the list has the whole width, only the start
                  // beside the details pane.
                  showingDetail ? { text: startLabel(event), tooltip: timeLabel(event) } : { text: timeLabel(event) },
                ]}
                detail={<List.Item.Detail markdown={eventMarkdown(event)} metadata={<EventMetadata event={event} />} />}
                actions={
                  <EventActions
                    event={event}
                    onChanged={revalidate}
                    toggleDetail={() => setShowingDetail(!showingDetail)}
                    showingDetail={showingDetail}
                  />
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function EventActions(props: {
  event: CalendarEvent;
  onChanged: () => void;
  toggleDetail: () => void;
  showingDetail: boolean;
}) {
  const { event } = props;
  const emails = event.attendees.map((a) => a.email);
  const respond = async (status: RsvpStatus) => {
    if (await rsvp(event.id, status)) props.onChanged();
  };
  const details = [
    event.title ?? "",
    `${dayLabel(toDate(event.start))}, ${timeLabel(event)}`,
    event.location,
    event.conference_url,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {event.conference_url && (
          <Action.OpenInBrowser
            title="Join Meeting"
            icon={conferenceIcon(event.conference_url)}
            url={event.conference_url}
          />
        )}
        {event.meeting_transcript_id !== undefined && (
          <Action.Push
            title="Show Meeting Notes"
            icon={sparkIcon("MeetingNotes", Color.SecondaryText)}
            target={<MeetingView meetingId={String(event.meeting_transcript_id)} />}
          />
        )}
        <Action
          title={props.showingDetail ? "Hide Details" : "Show Details"}
          icon={props.showingDetail ? actionIcon("SettingsLayoutFullScreen") : actionIcon("SettingsLayoutSplitView")}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
          onAction={props.toggleDetail}
        />
      </ActionPanel.Section>
      {event.attending_status && (
        <ActionPanel.Section title="Respond">
          <Action title="Accept" icon={sparkIcon("InviteAccept", Color.Green)} onAction={() => respond("accept")} />
          <Action title="Maybe" icon={sparkIcon("InviteMaybe", Color.Orange)} onAction={() => respond("maybe")} />
          <Action
            title="Decline"
            icon={sparkIcon("InviteDecline", Color.Red)}
            style={Action.Style.Destructive}
            onAction={() => respond("decline")}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {emails.length > 0 && (
          <Action.Push
            title="Email Attendees"
            icon={actionIcon("Composer")}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<ComposeForm to={emails.join(", ")} draftValues={{ subject: event.title }} />}
          />
        )}
        <Action.Push title="New Event" icon={actionIcon("AddNewEvent")} target={<EventForm />} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {event.conference_url && (
          <Action.CopyToClipboard
            title="Copy Meeting Link"
            content={event.conference_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        )}
        <Action.CopyToClipboard title="Copy Event Details" content={details} />
        <Action.CopyToClipboard title="Copy Event ID" content={event.id} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function eventIcon(event: CalendarEvent): Image.ImageLike {
  const now = Date.now();
  const start = toDate(event.start)?.getTime() ?? 0;
  const end = toDate(event.end)?.getTime() ?? 0;
  if (!event.all_day && start <= now && now < end) return sparkIcon("Clock", Color.Green);
  if (awaitsAnswer(event)) return sparkIcon("CalendarInvitation", Color.Orange);
  return sparkIcon("Calendar", Color.SecondaryText);
}

function eventAccessories(event: CalendarEvent): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (awaitsAnswer(event)) {
    accessories.push({
      tag: { value: event.attending_status === "pending" ? "Not answered" : "Maybe", color: Color.Orange },
    });
  }
  if (event.conference_url)
    accessories.push({ icon: conferenceIcon(event.conference_url), tooltip: "Has a video call" });
  if (event.meeting_transcript_id !== undefined) {
    accessories.push({ icon: sparkIcon("MeetingNotes", Color.SecondaryText), tooltip: "Meeting notes" });
  }
  if (event.calendar) accessories.push({ text: event.calendar.title });
  return accessories;
}

function eventMarkdown(event: CalendarEvent): string {
  const parts = [
    `## ${heading(event.title ?? "(no title)")}`,
    `${dayLabel(toDate(event.start))} · ${timeLabel(event)}`,
  ];
  // Invitation descriptions come from whoever sent the invite.
  if (event.notes) parts.push(`---\n\n${untrusted(event.notes)}`);
  return parts.join("\n\n");
}

// Spark's attendee badges carry their own colors.
const STATUS_ICONS: Record<AttendeeStatus, Image.ImageLike> = {
  accepted: sparkIcon("InviteParticipantAcceptedSmall"),
  declined: sparkIcon("InviteParticipantDeclinedSmall"),
  maybe: sparkIcon("InviteParticipantPossibleSmall"),
  pending: sparkIcon("InviteParticipantNoResponseSmall"),
};

function EventMetadata({ event }: { event: CalendarEvent }) {
  return (
    <List.Item.Detail.Metadata>
      {event.calendar && <List.Item.Detail.Metadata.Label title="Calendar" text={event.calendar.title} />}
      {event.location && (
        <List.Item.Detail.Metadata.Label
          title="Location"
          text={event.location}
          icon={sparkIcon("Location", Color.SecondaryText)}
        />
      )}
      {event.conference_url && (
        <List.Item.Detail.Metadata.Link title="Video Call" target={event.conference_url} text="Join" />
      )}
      {event.organizer && (
        <List.Item.Detail.Metadata.Label
          title="Organizer"
          text={formatAddress(event.organizer)}
          icon={sparkIcon("InviteParticipantOrganizerSmall")}
        />
      )}
      {event.attendees.length > 0 && <List.Item.Detail.Metadata.Separator />}
      {event.attendees.map((a, index) => (
        <List.Item.Detail.Metadata.Label
          key={a.email}
          title={index === 0 ? "Attendees" : ""}
          text={displayName(a)}
          icon={STATUS_ICONS[a.status] ?? STATUS_ICONS.pending}
        />
      ))}
    </List.Item.Detail.Metadata>
  );
}

export default withSparkCLI(Command);
