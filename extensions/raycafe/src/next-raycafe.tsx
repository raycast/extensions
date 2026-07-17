import { Action, ActionPanel, getPreferenceValues, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";

type RaycastEvent = {
  uid: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
  url?: string;
  status?: string;
};

type RawEvent = Record<string, string>;

export default function Command() {
  const preferences = getPreferenceValues<Preferences.NextRaycafe>();
  const { data, isLoading, error } = useCachedPromise(fetchUpcomingEvents, [preferences.calendarUrl]);
  const events = data ?? [];

  useEffect(() => {
    if (!error) {
      return;
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Could not refresh events",
      message: error.message,
    });
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Raycast events">
      {events.length === 0 ? (
        <List.EmptyView
          title={error ? "Could not load events" : "No upcoming Raycast events"}
          description={error ? "Please try again in a moment." : undefined}
        />
      ) : null}
      {events.map((event) => {
        const locationLabel = getLocationLabel(event.location);

        return (
          <List.Item
            key={event.uid}
            title={event.title}
            subtitle={locationLabel}
            keywords={[locationLabel ?? "", event.status ?? ""]}
            accessories={[{ date: event.start }]}
            actions={
              <ActionPanel>
                {event.url ? <Action.OpenInBrowser title="Open Event Page" url={event.url} /> : null}
                {event.url ? <Action.CopyToClipboard title="Copy Event URL" content={event.url} /> : null}
                {event.location ? <Action.CopyToClipboard title="Copy Location" content={event.location} /> : null}
                <Action title="Open Command Preferences" onAction={openCommandPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function fetchUpcomingEvents(calendarUrl: string): Promise<RaycastEvent[]> {
  const response = await fetch(calendarUrl);
  if (!response.ok) {
    throw new Error(`Failed to load calendar (${response.status})`);
  }

  const icsText = await response.text();
  const now = new Date();

  return parseIcsEvents(icsText)
    .map(toRaycastEvent)
    .filter((event): event is RaycastEvent => Boolean(event))
    .filter((event) => event.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function parseIcsEvents(icsText: string): RawEvent[] {
  const lines = unfoldIcsLines(icsText);
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        events.push(current);
      }
      current = null;
      continue;
    }
    if (!current) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const rawKey = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    const key = rawKey.split(";")[0];
    current[key] = decodeIcsText(value);
  }

  return events;
}

function unfoldIcsLines(icsText: string): string[] {
  const rawLines = icsText.split(/\r?\n/);
  const lines: string[] = [];

  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      // RFC5545 folded line continuation.
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  return lines;
}

function toRaycastEvent(raw: RawEvent): RaycastEvent | null {
  const start = parseIcsDate(raw.DTSTART);
  if (!start || !raw.UID || !raw.SUMMARY) {
    return null;
  }

  const url = pickEventUrl(raw);

  return {
    uid: raw.UID,
    title: raw.SUMMARY,
    start,
    end: parseIcsDate(raw.DTEND),
    location: raw.LOCATION,
    description: raw.DESCRIPTION,
    status: raw.STATUS,
    url,
  };
}

function parseIcsDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second = "00", isUtc] = match;
  if (isUtc) {
    return new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
    );
  }

  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function pickEventUrl(raw: RawEvent): string | undefined {
  if (raw.LOCATION && isUrl(raw.LOCATION)) {
    return raw.LOCATION;
  }

  if (!raw.DESCRIPTION) {
    return undefined;
  }

  const match = raw.DESCRIPTION.match(/https?:\/\/[^\s)"'>]+/);
  return match?.[0];
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function decodeIcsText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function getLocationLabel(location?: string): string | undefined {
  if (!location || isUrl(location)) {
    return undefined;
  }

  const [first, second] = location.split(",").map((part) => part.trim());
  if (!first) {
    return undefined;
  }

  if (!second || second.length < 3) {
    return first;
  }

  return `${first} · ${second}`;
}
