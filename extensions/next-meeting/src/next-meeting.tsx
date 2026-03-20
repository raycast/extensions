import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import {
  type CalendarEvent,
  JXA_SCRIPT,
  filterTodayOrTomorrow,
  formatTimeUntil,
  isEventPast,
  parseEvents,
  readCache,
  writeCache,
} from "./get-next-event";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractVideoLink(text: string): string | undefined {
  const patterns = [
    /https:\/\/meet\.google\.com\/[a-z-]+(\?[^\s]*)?/i,
    /https:\/\/zoom\.us\/j\/\d+(\?[^\s]*)?/i,
    /https:\/\/[a-z0-9]+\.zoom\.us\/j\/\d+(\?[^\s]*)?/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return undefined;
}

function getTimeColor(event: CalendarEvent): Color {
  if (event.isAllDay) return Color.Blue;
  const minutes = Math.floor(
    (event.startTimestamp * 1000 - Date.now()) / 60_000,
  );
  if (minutes <= 20) return Color.Red;
  if (minutes <= 40) return Color.Orange;
  if (minutes <= 60) return Color.Yellow;
  return Color.Green;
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export default function NextMeeting() {
  // 1. Read cache synchronously — instant render
  const cachedEvents = useMemo(() => {
    return filterTodayOrTomorrow(readCache().filter((e) => !isEventPast(e)));
  }, []);

  // 2. Fetch fresh data in background
  const { data: freshData, error } = useExec(
    "osascript",
    ["-l", "JavaScript", "-e", JXA_SCRIPT],
    {
      shell: false,
    },
  );

  // 3. Update cache when fresh data arrives
  useEffect(() => {
    if (freshData) writeCache(freshData);
  }, [freshData]);

  // Show fresh data if available, otherwise cached
  const events = freshData
    ? filterTodayOrTomorrow(
        parseEvents(freshData).filter((e) => !isEventPast(e)),
      )
    : cachedEvents;
  const showLoading = cachedEvents.length === 0 && !freshData;
  const stale = !freshData && cachedEvents.length > 0;

  return (
    <List isLoading={showLoading}>
      {error && cachedEvents.length === 0 && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Failed to load calendar"
          description={error.message}
        />
      )}
      {!showLoading && !error && events.length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No upcoming meetings"
          description="Your calendar is clear!"
        />
      )}
      {events.map((event, index) => {
        const videoLink = extractVideoLink(
          `${event.location} ${event.notes} ${event.url}`,
        );
        return (
          <List.Item
            key={`${event.title}-${event.startTimestamp}`}
            icon={{
              source: event.isAllDay ? Icon.Calendar : Icon.Clock,
              tintColor: getTimeColor(event),
            }}
            title={event.title}
            subtitle={
              event.isAllDay
                ? "All day"
                : `${formatTime(event.startTimestamp)} - ${formatTime(event.endTimestamp)}`
            }
            accessories={[
              ...(stale && index === 0
                ? [
                    {
                      tag: { value: "updating...", color: Color.SecondaryText },
                    },
                  ]
                : []),
              ...(event.location
                ? [{ icon: Icon.Pin, text: event.location }]
                : []),
              ...(videoLink
                ? [{ icon: Icon.Video, tooltip: "Video call available" }]
                : []),
              {
                tag: {
                  value: event.isAllDay
                    ? "all day"
                    : (() => {
                        const t = formatTimeUntil(
                          event.startTimestamp,
                          event.endTimestamp,
                        );
                        return t === "now" || t === "in progress"
                          ? t
                          : `in ${t}`;
                      })(),
                  color: getTimeColor(event),
                },
              },
            ]}
            actions={
              <ActionPanel>
                {videoLink && (
                  <Action.OpenInBrowser
                    title="Join Video Call"
                    url={videoLink}
                    icon={Icon.Video}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Meeting Name"
                  content={event.title}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
