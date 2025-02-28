import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { MorgenAPI, MorgenEvent } from "./api/morgen";

// Add debug mode constant
const DEBUG_MODE = false; // Set to true to enable debug mode

// Set Raw Event
interface RawEventData {
  [key: string]: unknown;
}

// Map to store raw event data
const eventRawDataMap = new Map<string, RawEventData>();

interface UIEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  calendarColor?: string;
  calendarId?: string;
  calendarName?: string;
  isTask: boolean; // Add field to identify if it's a task
}

// Expand on MorgenEvent to include additional metadata
interface ExtendedMorgenEvent extends MorgenEvent {
  "@type"?: string;
  "morgen.so:metadata"?: {
    location?: string;
    categoryColor?: string;
    taskId?: string;
    [key: string]: unknown;
  };
}

interface State {
  pastEvents: UIEvent[];
  upcomingEvents: UIEvent[];
  isLoading: boolean;
  error?: Error;
  selectedId?: string;
}

export default function Command() {
  const [state, setState] = useState<State>({ pastEvents: [], upcomingEvents: [], isLoading: true });

  useEffect(() => {
    async function fetchEvents() {
      try {
        const api = new MorgenAPI();
        const calendars = await api.getCalendars();
        const calendarMap = new Map<string, { color: string; name: string }>();
        calendars.forEach((cal) => {
          const color = cal["morgen.so:metadata"]?.overrideColor || cal.color || "#888888";
          const name = cal["morgen.so:metadata"]?.overrideName || cal.name || "Unknown Calendar";
          calendarMap.set(cal.id, { color, name });
        });

        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 3);
        const end = new Date(today);
        end.setDate(today.getDate() + 3);
        const startStr = start.toISOString();
        const endStr = end.toISOString();

        const events: MorgenEvent[] = await api.getEvents(startStr, endStr);
        const sorted = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const now = new Date();

        const pastEvents: UIEvent[] = [];
        const upcomingEvents: UIEvent[] = [];
        let defaultSelectedId: string | undefined;

        sorted.forEach((event) => {
          const extendedEvent = event as ExtendedMorgenEvent;

          if (extendedEvent["@type"] === "Frame") {
            return;
          }

          // Store raw event data for debugging
          if (DEBUG_MODE) {
            eventRawDataMap.set(event.id, event as unknown as RawEventData);
          }

          // New timezone handling method
          let startDate: Date;

          // Handle based on timezone type
          if (
            !event.timeZone ||
            event.timeZone === "UTC" ||
            event.timeZone === "Etc/UTC" ||
            event.timeZone === "GMT" ||
            event.timeZone === "Etc/GMT"
          ) {
            // UTC time: Add Z suffix to ensure correct parsing as UTC time, JavaScript will automatically convert to local timezone
            startDate = new Date(event.start + "Z");
          } else {
            // Non-UTC time: Interpret event time as time in specified timezone, then convert to local timezone
            startDate = convertTimeZoneToLocal(event.start, event.timeZone);
          }

          const endDate = new Date(startDate.getTime() + parseDuration(event.duration));

          const metadata = extendedEvent["morgen.so:metadata"] || {};
          const calendarInfo = calendarMap.get(event.calendarId || "");
          const color = metadata.categoryColor || calendarInfo?.color || "#888888";
          const calendarName = calendarInfo?.name || "Unknown Calendar";

          // Determine if it's a task
          const isTask = metadata.taskId !== undefined;

          const uiEvent: UIEvent = {
            id: event.id,
            title: event.title,
            description: event.description,
            startTime: startDate,
            endTime: endDate,
            calendarColor: color,
            calendarId: event.calendarId,
            calendarName: calendarName,
            isTask: isTask, // Set task flag
          };

          if (endDate < now) {
            pastEvents.push(uiEvent);
          } else {
            if (!defaultSelectedId && startDate <= now && endDate >= now) {
              defaultSelectedId = event.id;
            }
            upcomingEvents.push(uiEvent);
          }
        });

        if (!defaultSelectedId && upcomingEvents.length > 0) {
          defaultSelectedId = upcomingEvents[0].id;
        }

        setState({ pastEvents, upcomingEvents, isLoading: false, selectedId: defaultSelectedId });
      } catch (error) {
        setState({ pastEvents: [], upcomingEvents: [], isLoading: false, error: error as Error });
      }
    }
    fetchEvents();
  }, []);

  if (state.error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load events" description={state.error.message} />
      </List>
    );
  }

  const formatLocalTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false });
  };

  return (
    <List isLoading={state.isLoading} selectedItemId={state.selectedId}>
      {/* Upcoming Section */}
      {state.upcomingEvents.length > 0 && (
        <List.Section title="Upcoming">
          {state.upcomingEvents.map((event) => {
            return (
              <List.Item
                key={event.id}
                id={event.id}
                icon={{
                  source: event.isTask ? Icon.CheckCircle : Icon.Calendar,
                  tintColor: event.calendarColor,
                }}
                title={event.title}
                subtitle={`${formatLocalTime(event.startTime)} - ${formatLocalTime(event.endTime)}`}
                accessories={[{ text: event.calendarName || "" }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      target={
                        <EventDetailView
                          event={event}
                          rawData={DEBUG_MODE ? eventRawDataMap.get(event.id) : undefined}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Past Section */}
      {state.pastEvents.length > 0 && (
        <List.Section title="Past">
          {state.pastEvents.map((event) => {
            return (
              <List.Item
                key={event.id}
                id={event.id}
                icon={{
                  source: event.isTask ? Icon.CheckCircle : Icon.Clock,
                  tintColor: event.calendarColor,
                }}
                title={event.title}
                subtitle={`${formatLocalTime(event.startTime)} - ${formatLocalTime(event.endTime)}`}
                accessories={[{ text: event.calendarName || "" }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      target={
                        <EventDetailView
                          event={event}
                          rawData={DEBUG_MODE ? eventRawDataMap.get(event.id) : undefined}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

// Add event detail component that supports displaying debug information
function EventDetailView({ event, rawData }: { event: UIEvent; rawData?: RawEventData }) {
  let markdownContent = `# ${event.title}\n\n`;

  if (event.description) {
    markdownContent += `${event.description}\n\n`;
  }

  markdownContent += `**Time**: ${event.startTime.toLocaleString()} - ${event.endTime.toLocaleString()}\n\n`;
  markdownContent += `**Calendar**: ${event.calendarName || "Unknown Calendar"}`;

  // Add debug information
  if (DEBUG_MODE && rawData) {
    markdownContent += "\n\n---\n\n### Debug Information (Raw Data)\n\n";
    markdownContent += "```json\n";
    markdownContent += JSON.stringify(rawData, null, 2);
    markdownContent += "\n```";
  }

  return <Detail markdown={markdownContent} />;
}

// Completely rewritten timezone conversion function using more reliable methods
function convertTimeZoneToLocal(dateString: string, timeZone: string): Date {
  // Parse date and time parts
  const [datePart, timePart] = dateString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);

  // Get current system timezone
  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Create object representing specified date and time in source timezone
  const eventDate = new Date(
    Date.UTC(
      year,
      month - 1, // Months are 0-11
      day,
      hours,
      minutes,
      seconds || 0,
    ),
  );

  // Format using source timezone
  const sourceFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZoneName: "short",
  });

  // Format using local timezone
  const localFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: localTimeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZoneName: "short",
  });

  // 以下代码用于计算时区偏移但未被使用，可以删除
  // Calculate timezone offset (this method isn't the most accurate, but works for most cases)
  // Get ISO strings for both timezones
  sourceFormatter.format(eventDate);
  localFormatter.format(eventDate);

  // 删除未使用的变量解析代码
  // const sourceTime = sourceFormatter.format(eventDate);
  // const localTime = localFormatter.format(eventDate);
  // const sourceHour = parseInt(sourceTime.split(", ")[1].split(":")[0]);
  // const sourceMinute = parseInt(sourceTime.split(", ")[1].split(":")[1]);
  // const localHour = parseInt(localTime.split(", ")[1].split(":")[0]);
  // const localMinute = parseInt(localTime.split(", ")[1].split(":")[1]);

  // Create correct local date object
  const correctLocalDate = new Date(year, month - 1, day, hours, minutes, seconds || 0);

  return correctLocalDate;
}

function parseDuration(duration: string): number {
  const matches = duration.match(/PT(\d+)([HM])/i);
  if (!matches) return 0;
  const value = parseInt(matches[1]);
  const unit = matches[2].toUpperCase();
  return unit === "H" ? value * 60 * 60 * 1000 : value * 60 * 1000;
}
