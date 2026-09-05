import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { formatRange, humanDuration } from "../lib/format";
import {
  Area,
  ActivityType,
  areaActivityNames,
  eventMeeting,
  isRecurring,
  isReflected,
  reflectState,
  resolveActivity,
  resolveArea,
  ScheduleEvent,
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
  isShowingDetail?: boolean;
}) {
  const { event, areas, actions, activityTypes, isShowingDetail } = props;
  return (
    <List.Item
      icon={eventIcon(event)}
      title={event.name || "(untitled)"}
      subtitle={isShowingDetail ? event.start : undefined}
      keywords={eventKeywords(event, areas, activityTypes ?? [])}
      accessories={isShowingDetail ? undefined : accessories(event, areas)}
      detail={
        isShowingDetail ? <BlockDetail event={event} areas={areas} activityTypes={activityTypes ?? []} /> : undefined
      }
      actions={actions}
    />
  );
}

/** The right-hand detail pane: a title/notes body and a metadata table. */
export function BlockDetail(props: { event: ScheduleEvent; areas: Area[]; activityTypes: ActivityType[] }) {
  const { event, areas, activityTypes } = props;
  const title = event.name || "(untitled)";
  const area = resolveArea(event, areas);
  const activity = resolveActivity(event, activityTypes);
  const status = reflectLabel(event);
  const notes = typeof event.notes === "string" ? event.notes.trim() : "";
  const source = eventSource(event);
  const mirrors = Array.isArray(event.mirroredTo) ? event.mirroredTo.filter(Boolean).join(", ") : "";
  const meeting = eventMeeting(event);
  const locationText = typeof event.location?.text === "string" ? event.location.text.trim() : "";

  return (
    <List.Item.Detail
      markdown={`# ${title}${notes ? `\n\n${notes}` : ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Time" text={formatRange(event)} />
          <List.Item.Detail.Metadata.Label title="Duration" text={humanDuration(event.durationMinutes)} />
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
function eventKeywords(event: ScheduleEvent, areas: Area[], activityTypes: ActivityType[]): string[] {
  const words = areaActivityNames(event, areas, activityTypes);
  const source = eventSource(event);
  if (source) words.push(source);
  return words;
}

function eventIcon(event: ScheduleEvent) {
  if (event.readOnly) return { source: Icon.Lock, tintColor: Color.SecondaryText };
  if (isReflected(event)) return { source: Icon.CheckCircle, tintColor: Color.Green };
  return { source: Icon.Dot, tintColor: Color.PrimaryText };
}

function accessories(event: ScheduleEvent, areas: Area[]): List.Item.Accessory[] {
  const items: List.Item.Accessory[] = [];
  const area = resolveArea(event, areas);
  if (area) items.push({ tag: { value: area.name, color: area.color } });
  if (isRecurring(event)) items.push({ icon: Icon.Repeat, tooltip: "Repeats" });
  const meeting = eventMeeting(event);
  if (meeting) items.push({ icon: Icon.Video, tooltip: meeting.label ?? "Has a meeting link" });
  const source = eventSource(event);
  if (source) items.push({ icon: Icon.Calendar, tooltip: source });
  items.push({ text: formatRange(event) });
  return items;
}

/**
 * The calendar a block lives in, or "" for a Reassign-only block. A published
 * native block carries `calendar`; a synced one may carry only `source`.
 */
function eventSource(event: ScheduleEvent): string {
  if (typeof event.calendar === "string" && event.calendar) return event.calendar;
  if (!event.source || event.source === "reassign") return "";
  return event.source;
}

/** A human status label for a reflected block, or "" when it is still open. */
function reflectLabel(event: ScheduleEvent): string {
  const state = reflectState(event);
  return state ? state.charAt(0).toUpperCase() + state.slice(1) : "";
}
