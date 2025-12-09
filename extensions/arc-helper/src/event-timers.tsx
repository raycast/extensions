import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import { API, EventTimer } from "./api";

interface EventTimersResponse {
  data: EventTimer[];
}

interface EventWithStatus extends EventTimer {
  status: "active" | "upcoming" | "later";
  nextStart: Date | null;
  nextEnd: Date | null;
  minutesUntil: number | null;
}

function getEventStatus(event: EventTimer): EventWithStatus {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  let status: "active" | "upcoming" | "later" = "later";
  let nextStart: Date | null = null;
  let nextEnd: Date | null = null;
  let minutesUntil: number | null = null;

  for (const time of event.times) {
    const [startHour, startMinute] = time.start.split(":").map(Number);
    const [endHour, endMinute] = time.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
      status = "active";
      nextStart = new Date(now);
      nextStart.setUTCHours(startHour, startMinute, 0, 0);
      nextEnd = new Date(now);
      nextEnd.setUTCHours(endHour, endMinute, 0, 0);
      minutesUntil = 0;
      break;
    }

    if (currentTimeMinutes < startMinutes) {
      const diff = startMinutes - currentTimeMinutes;
      if (minutesUntil === null || diff < minutesUntil) {
        minutesUntil = diff;
        status = diff <= 60 ? "upcoming" : "later";
        nextStart = new Date(now);
        nextStart.setUTCHours(startHour, startMinute, 0, 0);
        nextEnd = new Date(now);
        nextEnd.setUTCHours(endHour, endMinute, 0, 0);
      }
    }
  }

  // Check for events that wrap to next day
  if (minutesUntil === null && event.times.length > 0) {
    const firstTime = event.times[0];
    const [startHour, startMinute] = firstTime.start.split(":").map(Number);
    const [endHour, endMinute] = firstTime.end.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    minutesUntil = 24 * 60 - currentTimeMinutes + startMinutes;
    nextStart = new Date(now);
    nextStart.setDate(nextStart.getDate() + 1);
    nextStart.setUTCHours(startHour, startMinute, 0, 0);
    nextEnd = new Date(now);
    nextEnd.setDate(nextEnd.getDate() + 1);
    nextEnd.setUTCHours(endHour, endMinute, 0, 0);
  }

  return { ...event, status, nextStart, nextEnd, minutesUntil };
}

function formatTimeUntil(minutes: number | null): string {
  if (minutes === null) return "Unknown";
  if (minutes === 0) return "Active now!";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function EventDetail({ event }: { event: EventWithStatus }) {
  const timesList = event.times.map((t) => `| ${t.start} UTC | ${t.end} UTC |`).join("\n");

  const markdown = `
# ${event.name}

![Icon](${event.icon})

**Map:** ${event.map}

${event.description || ""}

---

## Schedule (UTC)

| Start | End |
|-------|-----|
${timesList}

---

**Status:** ${event.status === "active" ? "ACTIVE NOW" : event.status === "upcoming" ? "Starting soon" : "Later today"}

${event.minutesUntil !== null && event.minutesUntil > 0 ? `**Next in:** ${formatTimeUntil(event.minutesUntil)}` : ""}
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
          <Detail.Metadata.Label title="Next In" text={formatTimeUntil(event.minutesUntil)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Times Today" text={`${event.times.length} occurrence(s)`} />
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

  const { isLoading, data, revalidate } = useFetch<EventTimersResponse>(API.eventTimers, {
    keepPreviousData: true,
  });

  const events = data?.data || [];
  const maps = [...new Set(events.map((e) => e.map))].sort();

  const eventsWithStatus = useMemo(() => {
    return events
      .map(getEventStatus)
      .filter((e) => mapFilter === "all" || e.map === mapFilter)
      .sort((a, b) => {
        // Sort by status (active first, then upcoming, then later)
        const statusOrder = { active: 0, upcoming: 1, later: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        // Then by minutes until
        return (a.minutesUntil || 9999) - (b.minutesUntil || 9999);
      });
  }, [events, mapFilter]);

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
          {activeEvents.map((event, idx) => (
            <List.Item
              key={`${event.name}-${event.map}-${idx}`}
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
          {upcomingEvents.map((event, idx) => (
            <List.Item
              key={`${event.name}-${event.map}-${idx}`}
              icon={{ source: event.icon, fallback: Icon.Clock }}
              title={event.name}
              subtitle={event.map}
              accessories={[
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
          {laterEvents.map((event, idx) => (
            <List.Item
              key={`${event.name}-${event.map}-${idx}`}
              icon={{ source: event.icon, fallback: Icon.Clock }}
              title={event.name}
              subtitle={event.map}
              accessories={[{ text: formatTimeUntil(event.minutesUntil) }]}
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
