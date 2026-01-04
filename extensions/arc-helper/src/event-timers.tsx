import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { API, EventTimer, EventTimerRaw } from "./api";

interface EventTimersResponse {
  data: EventTimerRaw[];
}

function parseTimeToMs(timeStr: string, baseDate: Date): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(baseDate);
  date.setUTCHours(hours, minutes, 0, 0);
  return date.getTime();
}

function transformRawEvents(rawEvents: EventTimerRaw[]): EventTimer[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const events: EventTimer[] = [];

  for (const raw of rawEvents) {
    for (const timeSlot of raw.times) {
      // Create event for today
      let startTime = parseTimeToMs(timeSlot.start, today);
      let endTime = parseTimeToMs(timeSlot.end, today);

      // Handle overnight events (e.g., 22:00 - 00:00)
      if (endTime <= startTime) {
        endTime += 24 * 60 * 60 * 1000; // Add 24 hours
      }

      events.push({
        name: raw.name,
        map: raw.map,
        icon: raw.icon,
        startTime,
        endTime,
      });

      // Create event for tomorrow
      startTime = parseTimeToMs(timeSlot.start, tomorrow);
      endTime = parseTimeToMs(timeSlot.end, tomorrow);
      if (endTime <= startTime) {
        endTime += 24 * 60 * 60 * 1000;
      }

      events.push({
        name: raw.name,
        map: raw.map,
        icon: raw.icon,
        startTime,
        endTime,
      });
    }
  }

  return events;
}

interface EventWithStatus extends EventTimer {
  status: "active" | "upcoming" | "later";
  startDate: Date;
  endDate: Date;
  minutesUntil: number;
}

function getEventStatus(event: EventTimer): EventWithStatus {
  const now = Date.now();
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  let status: "active" | "upcoming" | "later";
  let minutesUntil: number;

  if (now >= event.startTime && now < event.endTime) {
    status = "active";
    minutesUntil = 0;
  } else if (now < event.startTime) {
    const diff = Math.floor((event.startTime - now) / 60000);
    minutesUntil = diff;
    status = diff <= 60 ? "upcoming" : "later";
  } else {
    status = "later";
    minutesUntil = 9999;
  }

  return { ...event, status, startDate, endDate, minutesUntil };
}

function formatTimeUntil(minutes: number | null): string {
  if (minutes === null) return "Unknown";
  if (minutes === 0) return "Active now!";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function EventDetail({ event }: { event: EventWithStatus }) {
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

**Status:** ${event.status === "active" ? "ACTIVE NOW" : event.status === "upcoming" ? "Starting soon" : "Later"}

${event.minutesUntil > 0 ? `**Starts in:** ${formatTimeUntil(event.minutesUntil)}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Map" text={event.map} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={event.status === "active" ? "Active" : event.status === "upcoming" ? "Soon" : "Later"}
              color={
                event.status === "active"
                  ? Color.Green
                  : event.status === "upcoming"
                    ? Color.Yellow
                    : Color.SecondaryText
              }
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Starts In" text={formatTimeUntil(event.minutesUntil)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Start" text={formatDateTime(event.startDate)} />
          <Detail.Metadata.Label title="End" text={formatDateTime(event.endDate)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Event Name" content={event.name} />
        </ActionPanel>
      }
    />
  );
}

export default function EventTimers() {
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [tick, setTick] = useState(0);

  const { isLoading, data, revalidate } = useFetch<EventTimersResponse>(API.eventTimers, {
    keepPreviousData: true,
  });

  // Auto-refresh every 60 seconds to update event statuses
  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const rawEvents = data?.data || [];
  const events = useMemo(() => transformRawEvents(rawEvents), [rawEvents]);
  const maps = [...new Set(rawEvents.map((e) => e.map))].sort();

  const eventsWithStatus = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.endTime > now) // Filter out past events
      .map(getEventStatus)
      .filter((e) => mapFilter === "all" || e.map === mapFilter)
      .sort((a, b) => {
        // Sort by status (active first, then upcoming, then later)
        const statusOrder = { active: 0, upcoming: 1, later: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // Then by start time
        return a.startTime - b.startTime;
      });
  }, [events, mapFilter, tick]);

  const activeEvents = eventsWithStatus.filter((e) => e.status === "active");
  const upcomingEvents = eventsWithStatus.filter((e) => e.status === "upcoming");
  const laterEvents = eventsWithStatus.filter((e) => e.status === "later");

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
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {activeEvents.length > 0 && (
        <List.Section title="Active Now">
          {activeEvents.map((event) => (
            <List.Item
              key={`${event.name}-${event.map}-${event.startTime}`}
              icon={{ source: event.icon, fallback: Icon.Clock }}
              title={event.name}
              subtitle={event.map}
              accessories={[{ tag: { value: "ACTIVE", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<EventDetail event={event} />} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {upcomingEvents.length > 0 && (
        <List.Section title="Starting Soon">
          {upcomingEvents.map((event) => (
            <List.Item
              key={`${event.name}-${event.map}-${event.startTime}`}
              icon={{ source: event.icon, fallback: Icon.Clock }}
              title={event.name}
              subtitle={event.map}
              accessories={[
                { text: formatTime(event.startDate) },
                {
                  tag: {
                    value: formatTimeUntil(event.minutesUntil),
                    color: Color.Yellow,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<EventDetail event={event} />} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {laterEvents.length > 0 && (
        <List.Section title="Later">
          {laterEvents.map((event) => (
            <List.Item
              key={`${event.name}-${event.map}-${event.startTime}`}
              icon={{ source: event.icon, fallback: Icon.Clock }}
              title={event.name}
              subtitle={event.map}
              accessories={[{ text: formatTime(event.startDate) }, { text: formatTimeUntil(event.minutesUntil) }]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" icon={Icon.Eye} target={<EventDetail event={event} />} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
