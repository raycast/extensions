import { Action, ActionPanel, Keyboard, LaunchProps, List, Color } from "@raycast/api";
import { getAvatarIcon, useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import ErrorView from "./components/ErrorView";
import EventForm from "./components/EventForm";
import { positional } from "./lib/args";
import { parseAttendees, pickAttendee } from "./lib/attendees";
import { clock, dayLabel } from "./lib/events";
import { sparkJSON } from "./lib/spark";
import { AvailabilityResult, ContactsResult, formatDuration, toDate } from "./lib/types";
import { actionIcon, sparkIcon } from "./lib/sparkIcons";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

const RANGES = [
  { id: "today", title: "Today", args: [] as string[] },
  { id: "tomorrow", title: "Tomorrow", args: ["--tomorrow"] },
  { id: "week", title: "This Week", args: ["--week"] },
];

interface Slot {
  day: string;
  start: Date;
  end: Date;
  label: string;
}

function Command(props: LaunchProps<{ arguments: Arguments.FindFreeTime }>) {
  const [attendeesText, setAttendeesText] = useState(props.arguments.attendees ?? "");
  const [rangeId, setRangeId] = useCachedState("free-time-range", "week");
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[2];
  const { emails: attendees, partial } = parseAttendees(attendeesText);

  // The word being typed is looked up in contacts, like a composer's To field.
  const { data: suggestions = [], isLoading: searching } = useCachedPromise(
    async (query: string) =>
      (await sparkJSON<ContactsResult>(["contacts", positional(query)])).contacts.filter(
        (c) => !attendees.includes(c.email.toLowerCase()),
      ),
    [partial],
    { execute: partial.length >= 2, keepPreviousData: true, onError: () => undefined },
  );
  const shownSuggestions = partial.length >= 2 ? suggestions.slice(0, 8) : [];

  // Each answer carries the question it answers. While a new one loads, the
  // list keeps the last answer - your own slots, say, after adding someone -
  // which would read as free time with them, so only a matching one shows.
  const question = JSON.stringify([range.args, attendees]);
  const { data, isLoading, error, revalidate } = usePromise(
    async (asked: string, args: string[], people: string[]) => ({
      asked,
      result: await sparkJSON<AvailabilityResult>(
        ["availability", ...args, ...(people.length ? ["--attendees", people.join(",")] : [])],
        { timeout: 90_000 },
      ),
    }),
    [question, range.args, attendees],
    { onError: () => undefined },
  );
  const answer = data?.asked === question ? data.result : undefined;

  const slots: Slot[] = (answer?.free_slots ?? []).flatMap((s) => {
    const start = toDate(s.start);
    const end = toDate(s.end);
    return start && end ? [{ day: dayLabel(start), start, end, label: `${clock(start)} – ${clock(end)}` }] : [];
  });
  const days = [...new Set(slots.map((s) => s.day))];
  const summary = days
    .map(
      (day) =>
        `${day}: ${slots
          .filter((s) => s.day === day)
          .map((s) => s.label)
          .join(", ")}`,
    )
    .join("\n");

  useRefreshNotice(error, slots.length > 0, revalidate);

  return (
    <List
      isLoading={isLoading || (partial.length >= 2 && searching)}
      searchText={attendeesText}
      onSearchTextChange={setAttendeesText}
      throttle
      searchBarPlaceholder="Add attendees by name or email — empty for just you"
      navigationTitle={attendees.length ? `Free with ${attendees.join(", ")}` : "Your free time"}
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
          title={answer ? "No free slots in working hours" : "Checking availability…"}
        />
      )}
      {shownSuggestions.length > 0 && (
        <List.Section title="Contacts">
          {shownSuggestions.map((contact) => (
            <List.Item
              key={contact.email}
              icon={getAvatarIcon(contact.name?.trim() || contact.email)}
              title={contact.name?.trim() || contact.email}
              subtitle={contact.name?.trim() ? contact.email : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title="Add Attendee"
                    icon={actionIcon("PersonCircleAdd")}
                    onAction={() => setAttendeesText(pickAttendee(attendeesText, contact.email))}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {answer && answer.unchecked_attendees.length > 0 && (
        <List.Section title="Couldn't check">
          {answer.unchecked_attendees.map((person) => (
            <List.Item
              key={person}
              icon={sparkIcon("ErrorGeneral", Color.Orange)}
              title={person}
              subtitle="Free/busy isn't shared with you"
            />
          ))}
        </List.Section>
      )}
      {days.map((day) => (
        <List.Section key={day} title={day}>
          {slots
            .filter((s) => s.day === day)
            .map((slot) => (
              <List.Item
                key={slot.start.toISOString()}
                icon={sparkIcon("Clock", Color.SecondaryText)}
                title={slot.label}
                accessories={[{ text: formatDuration((slot.end.getTime() - slot.start.getTime()) / 1000) }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Create Event…"
                      icon={actionIcon("AddNewEvent")}
                      target={<EventForm start={slot.start} end={defaultEnd(slot)} attendees={attendees} />}
                    />
                    <Action.CopyToClipboard title="Copy Slot" content={`${day}, ${slot.label}`} />
                    <Action.CopyToClipboard
                      title="Copy All Slots"
                      content={summary}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.Paste title="Paste All Slots" content={summary} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

/// Proposes a 30-minute meeting at the start of the slot.
function defaultEnd(slot: Slot): Date {
  const end = new Date(slot.start.getTime() + 30 * 60_000);
  return end > slot.end ? slot.end : end;
}

export default withSparkCLI(Command);
