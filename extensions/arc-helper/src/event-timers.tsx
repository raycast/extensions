import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { API, EventTimer, EventsScheduleResponse, MetaForgeUrl } from "./api";
import { formatDuration } from "./format";
import { findMap } from "./maps";
import { RefreshAction, loadFailure } from "./ui";

type EventStatus = "active" | "upcoming" | "later";

interface EventWithStatus extends EventTimer {
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  minutesUntil: number;
}

const UPCOMING_WINDOW_MINUTES = 60;

const STATUS: Record<EventStatus, { section: string; label: string; detail: string; color: Color }> = {
  active: { section: "Active Now", label: "Active", detail: "ACTIVE NOW", color: Color.Green },
  upcoming: { section: "Starting Soon", label: "Soon", detail: "Starting soon", color: Color.Yellow },
  later: { section: "Later", label: "Later", detail: "Later", color: Color.SecondaryText },
};

function withStatus(event: EventTimer, now: number): EventWithStatus {
  const minutesUntil = Math.max(0, Math.ceil((event.startTime - now) / 60000));
  const status: EventStatus =
    now >= event.startTime ? "active" : minutesUntil <= UPCOMING_WINDOW_MINUTES ? "upcoming" : "later";
  return { ...event, status, startDate: new Date(event.startTime), endDate: new Date(event.endTime), minutesUntil };
}

function timeUntil(event: EventWithStatus): string {
  return event.status === "active" ? "Active now!" : formatDuration(event.minutesUntil);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function EventActions({ event, onRefresh }: { event: EventWithStatus; onRefresh: () => void }) {
  const map = findMap(event.map);
  return (
    <>
      {map && <Action.OpenInBrowser title="Open Map" icon={Icon.Map} url={MetaForgeUrl.map(map.slug)} />}
      <Action.CopyToClipboard title="Copy Event Name" content={event.name} />
      <RefreshAction onRefresh={onRefresh} />
    </>
  );
}

function EventDetail({ event, region, onRefresh }: { event: EventWithStatus; region?: string; onRefresh: () => void }) {
  const status = STATUS[event.status];
  const markdown = `
# ${event.name}

![Icon](${event.icon})

**Map:** ${event.map}

---

## Event Time

| Start | End |
|-------|-----|
| ${formatDateTime(event.startDate)} | ${formatDateTime(event.endDate)} |

---

**Status:** ${status.detail}

${event.status !== "active" ? `**Starts in:** ${timeUntil(event)}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Map" text={event.map} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.label} color={status.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Starts In" text={timeUntil(event)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Start" text={formatDateTime(event.startDate)} />
          <Detail.Metadata.Label title="End" text={formatDateTime(event.endDate)} />
          {region && <Detail.Metadata.Label title="Schedule Region" text={region} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <EventActions event={event} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function accessoriesFor(event: EventWithStatus): List.Item.Accessory[] {
  switch (event.status) {
    case "active":
      return [{ tag: { value: "ACTIVE", color: Color.Green } }];
    case "upcoming":
      return [{ text: formatTime(event.startDate) }, { tag: { value: timeUntil(event), color: Color.Yellow } }];
    default:
      return [{ text: formatTime(event.startDate) }, { text: timeUntil(event) }];
  }
}

export default function EventTimers() {
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [now, setNow] = useState(() => Date.now());

  const { isLoading, data, revalidate } = useFetch<EventsScheduleResponse>(API.eventsSchedule, {
    keepPreviousData: true,
    failureToastOptions: loadFailure("events"),
  });

  // Re-evaluate event statuses every minute so events move from "upcoming" to "active" on their own.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const events = data?.data ?? [];
  const region = data?.region ? data.region.charAt(0).toUpperCase() + data.region.slice(1) : undefined;
  const maps = [...new Set(events.map((event) => event.map))].sort();

  const groups = useMemo(() => {
    const visible = events
      .filter((event) => event.endTime > now && (mapFilter === "all" || event.map === mapFilter))
      .map((event) => withStatus(event, now))
      .sort((a, b) => a.startTime - b.startTime);
    return (Object.keys(STATUS) as EventStatus[]).map((status) => ({
      status,
      events: visible.filter((event) => event.status === status),
    }));
  }, [events, mapFilter, now]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search events..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Map" value={mapFilter} onChange={setMapFilter}>
          <List.Dropdown.Item title="All Maps" value="all" />
          <List.Dropdown.Section title="Maps">
            {maps.map((map) => (
              <List.Dropdown.Item key={map} title={map} value={map} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <RefreshAction onRefresh={revalidate} />
        </ActionPanel>
      }
    >
      {groups.map(
        (group) =>
          group.events.length > 0 && (
            <List.Section key={group.status} title={STATUS[group.status].section}>
              {group.events.map((event) => (
                <List.Item
                  key={`${event.name}-${event.map}-${event.startTime}`}
                  icon={{ source: event.icon, fallback: Icon.Clock }}
                  title={event.name}
                  subtitle={event.map}
                  keywords={[event.map]}
                  accessories={accessoriesFor(event)}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={<EventDetail event={event} region={region} onRefresh={revalidate} />}
                      />
                      <EventActions event={event} onRefresh={revalidate} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ),
      )}
    </List>
  );
}
