import { Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { listInvitees, listMeetings } from "./api/meetings";
import { Invitee, ScheduledEvent } from "./api/types";
import { MeetingActions } from "./components/meeting-actions";
import { mapWithConcurrency } from "./lib/async";
import { endOfRange, formatMeetingDate, formatMeetingTime } from "./lib/dates";
import { calendlyOAuth } from "./oauth/calendly";

interface MeetingWithInvitee {
  meeting: ScheduledEvent;
  invitee?: Invitee;
}

function sectionTitle(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = endOfRange(today, 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return formatMeetingDate(value);
}

async function loadMeetings(): Promise<MeetingWithInvitee[]> {
  const now = new Date();
  const meetings = await listMeetings({ startTime: now, endTime: endOfRange(now, 90) });
  return mapWithConcurrency(meetings, 5, async (meeting) => {
    try {
      const invitees = await listInvitees(meeting.uri);
      return { meeting, invitee: invitees[0] };
    } catch {
      return { meeting };
    }
  });
}

function UpcomingMeetings() {
  const { data = [], isLoading, revalidate } = useCachedPromise(loadMeetings, []);
  const sections = data.reduce<Map<string, MeetingWithInvitee[]>>((result, item) => {
    const title = sectionTitle(item.meeting.start_time);
    result.set(title, [...(result.get(title) ?? []), item]);
    return result;
  }, new Map());

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search upcoming meetings…">
      {!isLoading && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Upcoming Meetings"
          description="Your active Calendly meetings for the next 90 days will appear here."
        />
      ) : null}
      {[...sections.entries()].map(([title, meetings]) => (
        <List.Section key={title} title={title}>
          {meetings.map(({ meeting, invitee }) => (
            <List.Item
              key={meeting.uri}
              icon={Icon.Calendar}
              title={meeting.name}
              subtitle={invitee?.name}
              keywords={[invitee?.name, invitee?.email, meeting.location?.type].filter(
                (value): value is string => !!value,
              )}
              accessories={[
                ...(meeting.location?.type ? [{ text: meeting.location.type.replaceAll("_", " ") }] : []),
                { text: formatMeetingTime(meeting.start_time), tooltip: new Date(meeting.start_time).toLocaleString() },
              ]}
              actions={<MeetingActions meeting={meeting} invitee={invitee} onCanceled={revalidate} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default withAccessToken(calendlyOAuth)(UpcomingMeetings);
