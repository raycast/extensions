import { Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { listInvitees, listMeetings } from "./api/meetings";
import { Invitee, ScheduledEvent } from "./api/types";
import { MeetingActions } from "./components/meeting-actions";
import { mapWithConcurrency } from "./lib/async";
import { endOfRange, formatMeetingDate, formatMeetingTime } from "./lib/dates";
import { calendlyOAuth } from "./oauth/calendly";

const RANGE_OPTIONS = [
  { value: "7", title: "Next 7 Days" },
  { value: "30", title: "Next 30 Days" },
  { value: "90", title: "Next 90 Days" },
] as const;

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

async function loadMeetings(days: number) {
  const now = new Date();
  return listMeetings({ startTime: now, endTime: endOfRange(now, days) });
}

async function loadInvitees(uris: string[]): Promise<Record<string, Invitee | undefined>> {
  const entries = await mapWithConcurrency(uris, 5, async (uri) => {
    try {
      const invitees = await listInvitees(uri);
      return [uri, invitees[0]] as const;
    } catch {
      return [uri, undefined] as const;
    }
  });
  return Object.fromEntries(entries);
}

function UpcomingMeetings() {
  const [rangeDays, setRangeDays] = useState("30");
  const {
    data: meetings = [],
    isLoading,
    revalidate,
  } = useCachedPromise(loadMeetings, [Number(rangeDays)], {
    keepPreviousData: true,
  });
  const meetingUris = meetings.map((meeting) => meeting.uri);
  const { data: inviteesByUri = {} } = useCachedPromise(loadInvitees, [meetingUris], {
    execute: meetingUris.length > 0,
    keepPreviousData: true,
  });
  const data: MeetingWithInvitee[] = meetings.map((meeting) => ({
    meeting,
    invitee: inviteesByUri[meeting.uri],
  }));
  const sections = data.reduce<Map<string, MeetingWithInvitee[]>>((result, item) => {
    const title = sectionTitle(item.meeting.start_time);
    result.set(title, [...(result.get(title) ?? []), item]);
    return result;
  }, new Map());

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search upcoming meetings…"
      searchBarAccessory={
        <List.Dropdown tooltip="Date Range" value={rangeDays} onChange={setRangeDays} storeValue>
          {RANGE_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Upcoming Meetings"
          description={`Your active Calendly meetings for the next ${rangeDays} days will appear here.`}
        />
      ) : null}
      {[...sections.entries()].map(([title, sectionMeetings]) => (
        <List.Section key={title} title={title}>
          {sectionMeetings.map(({ meeting, invitee }) => (
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
