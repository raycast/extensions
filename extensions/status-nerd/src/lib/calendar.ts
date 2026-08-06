import { expandRecurringEvent, sync, type VEvent } from "node-ical";

export interface Meeting {
  title: string;
  agenda: string;
  start: Date;
  end: Date;
  /** true if the meeting is running right now, false if it's the next one */
  ongoing: boolean;
}

const WINDOW_AHEAD_MS = 24 * 3600_000;
const AGENDA_MAX = 600;
const DEFAULT_LEN_MS = 30 * 60_000;

/** ParameterValue can be a string or a { val, params } object — normalize it. */
function asText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "val" in (value as Record<string, unknown>)
  ) {
    return String((value as { val: unknown }).val ?? "");
  }
  return String(value);
}

function cleanAgenda(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  return trimmed.length > AGENDA_MAX
    ? `${trimmed.slice(0, AGENDA_MAX)}…`
    : trimmed;
}

/**
 * Fetch the ICS feed and return the meeting to base a status on: the one
 * running right now, or otherwise the next one within the next 24h.
 * Skips all-day and cancelled events.
 */
export async function getCurrentOrNextMeeting(
  icsUrl: string,
): Promise<Meeting | null> {
  const response = await fetch(icsUrl);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Calendar not found (404). Use the 'Secret address in iCal format' from Google Calendar — it ends in /basic.ics.",
      );
    }
    throw new Error(`Calendar fetch failed (${response.status})`);
  }
  const data = sync.parseICS(await response.text());
  const now = new Date();
  const to = new Date(now.getTime() + WINDOW_AHEAD_MS);

  const candidates: Meeting[] = [];
  for (const component of Object.values(data)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (event.status === "CANCELLED") continue;

    if (event.rrule) {
      const instances = expandRecurringEvent(event, {
        from: now,
        to,
        expandOngoing: true,
      });
      for (const instance of instances) {
        if (instance.isFullDay) continue;
        candidates.push(
          buildMeeting(
            asText(instance.summary),
            asText(event.description),
            instance.start,
            instance.end,
            now,
          ),
        );
      }
    } else {
      if (event.datetype === "date") continue; // all-day
      const start = event.start;
      if (!start) continue;
      const end = event.end ?? new Date(start.getTime() + DEFAULT_LEN_MS);
      if (end > now && start < to) {
        candidates.push(
          buildMeeting(
            asText(event.summary),
            asText(event.description),
            start,
            end,
            now,
          ),
        );
      }
    }
  }

  const named = candidates.filter((m) => m.title.trim().length > 0);

  // Prefer the currently running meeting (latest start if several overlap).
  const ongoing = named
    .filter((m) => m.start <= now && m.end > now)
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  if (ongoing.length > 0) return ongoing[0];

  // Otherwise the soonest upcoming one.
  const upcoming = named
    .filter((m) => m.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return upcoming[0] ?? null;
}

function buildMeeting(
  title: string,
  agenda: string,
  start: Date,
  end: Date,
  now: Date,
): Meeting {
  return {
    title: title.trim(),
    agenda: cleanAgenda(agenda),
    start,
    end,
    ongoing: start <= now && end > now,
  };
}
