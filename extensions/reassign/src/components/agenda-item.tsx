import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { clockPart, formatRange, humanDuration } from "../lib/format";
import {
  Area,
  ActivityType,
  areaActivityNames,
  Calendar,
  eventMeeting,
  homeCalendarId,
  isRecurring,
  isReflected,
  reflectState,
  resolveActivity,
  resolveArea,
  ScheduleEvent,
  spanMinutes,
} from "../lib/schedule-model";

/**
 * One agenda row. In the plain list it shows the area tag, source, and time as
 * accessories. In detail mode the list narrows and a `BlockDetail` pane carries
 * the full metadata, so the row shows just the name and start time.
 */
export function AgendaItem(props: {
  event: ScheduleEvent;
  areas: Area[];
  actions: ReactNode;
  activityTypes?: ActivityType[];
  calendars?: Calendar[];
  defaultCalendarId?: string | null;
  isShowingDetail?: boolean;
}) {
  const { event, areas, actions, activityTypes, isShowingDetail, defaultCalendarId } = props;
  const calendars = props.calendars ?? [];
  return (
    <List.Item
      icon={eventIcon(event)}
      title={event.name || "(untitled)"}
      subtitle={isShowingDetail ? clockPart(event.start) : undefined}
      keywords={eventKeywords(event, areas, activityTypes ?? [], calendars, defaultCalendarId)}
      accessories={isShowingDetail ? undefined : accessories(event, areas, calendars, defaultCalendarId)}
      detail={
        isShowingDetail ? (
          <BlockDetail
            event={event}
            areas={areas}
            activityTypes={activityTypes ?? []}
            calendars={calendars}
            defaultCalendarId={defaultCalendarId}
          />
        ) : undefined
      }
      actions={actions}
    />
  );
}

/** The right-hand detail pane: a title/notes body and a metadata table. */
export function BlockDetail(props: {
  event: ScheduleEvent;
  areas: Area[];
  activityTypes: ActivityType[];
  calendars: Calendar[];
  defaultCalendarId?: string | null;
}) {
  const { event, areas, activityTypes, calendars, defaultCalendarId } = props;
  const title = event.name || "(untitled)";
  const area = resolveArea(event, areas);
  const activity = resolveActivity(event, activityTypes);
  const status = reflectLabel(event);
  const notes = typeof event.notes === "string" ? event.notes.trim() : "";
  const source = homeCalendarLabel(event, calendars, defaultCalendarId);
  const mirrors = (event.mirrorCalendarIds ?? [])
    .map((id) => calendars.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  const minutes = spanMinutes(event);
  const meeting = eventMeeting(event);
  const locationText = typeof event.location?.text === "string" ? event.location.text.trim() : "";

  return (
    <List.Item.Detail
      markdown={`# ${title}${notes ? `\n\n${notes}` : ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Time" text={formatRange(event)} />
          {minutes !== null ? <List.Item.Detail.Metadata.Label title="Duration" text={humanDuration(minutes)} /> : null}
          {meeting ? (
            <List.Item.Detail.Metadata.Link
              title="Meeting"
              target={meeting.url}
              text={meeting.label ? `Join ${meeting.label}` : "Join"}
            />
          ) : null}
          {locationText ? <List.Item.Detail.Metadata.Label title="Location" text={locationText} /> : null}
          {area ? (
            <List.Item.Detail.Metadata.TagList title="Area">
              <List.Item.Detail.Metadata.TagList.Item text={area.name} color={area.color} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {activity ? <List.Item.Detail.Metadata.Label title="Activity" text={activity.name} /> : null}
          <List.Item.Detail.Metadata.Label title="Calendar" text={source || "Reassign"} />
          {mirrors ? <List.Item.Detail.Metadata.Label title="Mirrored to" text={mirrors} /> : null}
          {status ? <List.Item.Detail.Metadata.Label title="Status" text={status} /> : null}
          {event.warning ? <List.Item.Detail.Metadata.Label title="Warning" text={event.warning} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** Search keywords for a row: the area, activity, and source names, when present. */
function eventKeywords(
  event: ScheduleEvent,
  areas: Area[],
  activityTypes: ActivityType[],
  calendars: Calendar[],
  defaultCalendarId?: string | null,
): string[] {
  const words = areaActivityNames(event, areas, activityTypes);
  const source = homeCalendarName(event, calendars, defaultCalendarId);
  if (source) words.push(source);
  return words;
}

function eventIcon(event: ScheduleEvent) {
  if (event.readOnly) return { source: Icon.Lock, tintColor: Color.SecondaryText };
  if (isReflected(event)) return { source: Icon.CheckCircle, tintColor: Color.Green };
  return { source: Icon.Dot, tintColor: Color.PrimaryText };
}

function accessories(
  event: ScheduleEvent,
  areas: Area[],
  calendars: Calendar[],
  defaultCalendarId?: string | null,
): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  const area = resolveArea(event, areas);
  if (area) items.push({ tag: { value: area.name, color: area.color } });
  if (isRecurring(event)) items.push({ icon: Icon.Repeat, tooltip: "Repeats" });
  const meeting = eventMeeting(event);
  if (meeting) items.push({ icon: Icon.Video, tooltip: meeting.label ?? "Has a meeting link" });
  const source = homeCalendarLabel(event, calendars, defaultCalendarId);
  if (source) items.push({ icon: Icon.Calendar, tooltip: source });
  items.push({ text: formatRange(event) });
  return items;
}

/**
 * The resolved calendar name or sync origin of a block, or "" when it cannot be
 * named yet. Never returns the "Connected calendar" loading placeholder, so it is
 * safe to feed to `List.Item.keywords` (a search-index prop): the placeholder must
 * not leak into the built-in search index. The name comes from GET /calendars by
 * the home calendar id; an unknown one falls back to `source` for a synced block.
 */
function homeCalendarName(event: ScheduleEvent, calendars: Calendar[], defaultCalendarId?: string | null): string {
  const homeId = homeCalendarId(event, defaultCalendarId);
  const home = homeId ? calendars.find((c) => c.id === homeId) : undefined;
  if (home) return home.name;
  return event.source && event.source !== "reassign" ? event.source : "";
}

/**
 * The calendar label of a block for user-read surfaces (the BlockDetail
 * "Calendar" label and the accessory tooltip). Returns the resolved name, the
 * sync origin, or the "Connected calendar" placeholder while GET /calendars
 * cannot yet name a known home; "" for a Reassign-only block (rendered as
 * "Reassign" by callers). Differs from `homeCalendarName` only in the placeholder.
 */
function homeCalendarLabel(event: ScheduleEvent, calendars: Calendar[], defaultCalendarId?: string | null): string {
  const name = homeCalendarName(event, calendars, defaultCalendarId);
  if (name) return name;
  const homeId = homeCalendarId(event, defaultCalendarId);
  return homeId ? "Connected calendar" : "";
}

/** A human status label for a reflected block, or "" when it is still open. */
function reflectLabel(event: ScheduleEvent): string {
  const state = reflectState(event);
  return state ? state.charAt(0).toUpperCase() + state.slice(1) : "";
}
