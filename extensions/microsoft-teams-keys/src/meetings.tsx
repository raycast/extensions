import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Meeting, teamsMeetings } from "./lib/calendar";
import { MeetingItem, MeetingsEmptyView, dayTitle } from "./lib/meeting-ui";

const DAYS_AHEAD = 7;

function groupByDay(meetings: Meeting[]): [string, Meeting[]][] {
  const groups = new Map<string, Meeting[]>();
  for (const meeting of meetings) {
    const title = dayTitle(meeting.start);
    groups.set(title, [...(groups.get(title) ?? []), meeting]);
  }
  return [...groups.entries()];
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from.getTime() + (DAYS_AHEAD + 1) * 86_400_000);
    // Meetings that are already over today are left out.
    return (await teamsMeetings(from, to)).filter((m) => m.end > now);
  });

  const now = new Date();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search meetings">
      <MeetingsEmptyView
        error={error}
        onReload={revalidate}
        emptyText={`Nothing with a Teams link in the next ${DAYS_AHEAD} days. Meetings come from the Calendar app, so your work account has to be added there.`}
      />
      {groupByDay(data ?? []).map(([day, meetings]) => (
        <List.Section key={day} title={day}>
          {meetings.map((meeting) => (
            <MeetingItem key={meeting.id} meeting={meeting} now={now} onReload={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
