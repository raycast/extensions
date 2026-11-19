import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import CreateEventForm from "./components/create-event-form";
import EventActions from "./components/event-actions";
import EventPanel, { RESPONSES } from "./components/event-panel";
import { describeError, leaf, showLeafError } from "./lib/leaf";
import { addDays, dayTitle, formatSpan, groupByDay, startOfDay, toIsoLocal } from "./lib/time";
import type { Calendar, LeafEvent, LeafEventDetail } from "./lib/types";

const ALL = "all";

/** Your events from today on, by day, filtered by calendar. */
export default function Agenda() {
  const days = Number(getPreferenceValues<Preferences.Agenda>().daysAhead);
  const [calendarId, setCalendarId] = useState(ALL);

  // Calendars And Events
  const calendars = useCachedPromise(() => leaf().call("calendars.list"), [], { onError: showLeafError });
  const events = useCachedPromise(
    (count: number) => {
      const from = startOfDay(new Date());
      return leaf().call("events.list", { start: toIsoLocal(from), end: toIsoLocal(addDays(from, count)) });
    },
    [days],
    { onError: showLeafError },
  );

  // The Side Panel (on or off, remembered) And The Selected Event's Description And Guests For It
  const [showingDetail, setShowingDetail] = useCachedState("agenda-showing-detail", true);
  const [selectedId, setSelectedId] = useState<string>();
  const detail = useCachedPromise((id: string) => leaf().call("events.get", { id }), [selectedId ?? ""], {
    execute: showingDetail && Boolean(selectedId),
    onError: showLeafError,
  });
  const toggleDetail = () => setShowingDetail((on) => !on);

  const calendarById = new Map((calendars.data ?? []).map((calendar) => [calendar.id, calendar]));
  const shown = (events.data ?? []).filter((event) => calendarId === ALL || event.calendarId === calendarId);
  const now = new Date();
  const groups = groupByDay(shown, now);
  const error = events.error ?? calendars.error;

  function refresh() {
    calendars.revalidate();
    events.revalidate();
    if (showingDetail && selectedId) {
      detail.revalidate();
    }
  }

  const createAction = (
    <Action.Push
      title="Create Event"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<CreateEventForm onCreated={refresh} />}
    />
  );

  return (
    <List
      isLoading={events.isLoading || calendars.isLoading}
      isShowingDetail={showingDetail && groups.length > 0}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarPlaceholder="Search events"
      searchBarAccessory={
        <List.Dropdown tooltip="Calendar" storeValue onChange={setCalendarId}>
          <List.Dropdown.Item title="All Calendars" value={ALL} icon={Icon.Calendar} />
          <List.Dropdown.Section>
            {(calendars.data ?? []).map((calendar) => (
              <List.Dropdown.Item
                key={calendar.id}
                title={calendar.name}
                value={calendar.id}
                icon={{ source: Icon.CircleFilled, tintColor: calendar.color }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Calendar}
        title={error ? describeError(error).title : days === 1 ? "Nothing today" : `Nothing in the next ${days} days`}
        description={error ? describeError(error).message : undefined}
        actions={
          <ActionPanel>
            {error ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} /> : createAction}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
      {groups.map(({ day, items }) => (
        <List.Section key={day.getTime()} title={dayTitle(day, now)} subtitle={String(items.length)}>
          {items.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              detail={detail.data?.id === event.id ? detail.data : undefined}
              detailLoading={event.id === selectedId && detail.isLoading}
              day={day}
              calendar={calendarById.get(event.calendarId)}
              onChange={refresh}
              showingDetail={showingDetail}
              onToggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EventItem({
  event,
  detail,
  detailLoading,
  day,
  calendar,
  onChange,
  showingDetail,
  onToggleDetail,
}: {
  event: LeafEvent;
  detail?: LeafEventDetail;
  detailLoading: boolean;
  day: Date;
  calendar?: Calendar;
  onChange: () => void;
  showingDetail: boolean;
  onToggleDetail: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (event.response !== "accepted") {
    accessories.push({ icon: RESPONSES[event.response].icon, tooltip: RESPONSES[event.response].label });
  }

  if (event.meetingLink) {
    accessories.push({ icon: Icon.Video, tooltip: "Has a meeting link" });
  }

  accessories.push({ text: formatSpan(event, day) });

  return (
    <List.Item
      id={event.id}
      icon={{ source: Icon.CircleFilled, tintColor: event.color }}
      title={event.title || "(No title)"}
      subtitle={event.location ?? undefined}
      keywords={[calendar?.name, event.location].filter((k): k is string => Boolean(k))}
      accessories={accessories}
      detail={<EventPanel event={event} detail={detail} day={day} calendar={calendar} isLoading={detailLoading} />}
      actions={
        <EventActions
          event={event}
          day={day}
          calendar={calendar}
          onChange={onChange}
          showingDetail={showingDetail}
          onToggleDetail={onToggleDetail}
        />
      }
    />
  );
}
