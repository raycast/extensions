import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { failedCalendarsText, teamsMeetings } from "./lib/calendar";
import { findMeetingLink } from "./lib/links";
import { MeetingItem, MeetingsEmptyView, dayTitle, joinLink } from "./lib/meeting-ui";

const SOON_MINUTES = 15;

function LinkItem(props: { link: string; title: string }) {
  return (
    <List.Item
      title={props.title}
      subtitle={props.link}
      icon={Icon.Link}
      actions={
        <ActionPanel>
          <Action title="Join Meeting" icon={Icon.Video} onAction={() => joinLink(props.link, "the meeting")} />
        </ActionPanel>
      }
    />
  );
}

/**
 * Like Join Next Teams Meeting, but you pick: what is running or about to
 * start comes first, then the rest of today and tomorrow. A Teams link on the
 * clipboard or typed into the search bar can be joined as well.
 */
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const now = new Date();
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    // Long meetings that started hours ago still count, so look back a day.
    const { meetings, failedCalendars } = await teamsMeetings(new Date(now.getTime() - 86_400_000), endOfTomorrow);
    if (failedCalendars.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Some calendars are missing",
        message: failedCalendarsText(failedCalendars),
      });
    }
    return { meetings: meetings.filter((m) => m.end > now) };
  });
  // Read on its own, so a copied link can be joined even when the calendar cannot be read.
  const { data: clipboard } = usePromise(async () =>
    findMeetingLink(await Clipboard.readText().catch(() => undefined)),
  );

  const now = new Date();
  const soon = new Date(now.getTime() + SOON_MINUTES * 60_000);
  const meetings = data?.meetings ?? [];
  const current = meetings.filter((m) => !m.allDay && m.start <= soon);
  const later = meetings.filter((m) => !current.includes(m));
  const today = later.filter((m) => dayTitle(m.start) === "Today");
  const tomorrow = later.filter((m) => dayTitle(m.start) !== "Today");
  const typedLink = findMeetingLink(searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search meetings, or paste a Teams link"
      onSearchTextChange={setSearchText}
      filtering={!typedLink}
    >
      {typedLink ? <LinkItem link={typedLink} title="Join This Link" /> : null}
      {!typedLink && clipboard ? (
        <List.Section title="Clipboard">
          <LinkItem link={clipboard} title="Meeting Link from Clipboard" />
        </List.Section>
      ) : null}
      <MeetingsEmptyView
        error={error}
        onReload={revalidate}
        emptyText="Nothing with a Teams link today or tomorrow. Meetings come from the Calendar app, so your work account has to be added there."
      />
      <List.Section title="Now and Next">
        {current.map((m) => (
          <MeetingItem key={m.id} meeting={m} now={now} onReload={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Later Today">
        {today.map((m) => (
          <MeetingItem key={m.id} meeting={m} now={now} onReload={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Tomorrow">
        {tomorrow.map((m) => (
          <MeetingItem key={m.id} meeting={m} now={now} onReload={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}
