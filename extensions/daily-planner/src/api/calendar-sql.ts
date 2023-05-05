import { homedir } from "os";
import { resolve } from "path";
import { TASK_BLOCK_DEEPLINK_PREFIX, BREAK_BLOCK_DEEPLINK } from "./todo-source";
import { REMINDERS_URL_PREFIX } from "./todo-source/reminders-sql";
import { THINGS_URL_PREFIX } from "./todo-source/things-sql";
import { TODOIST_APP_URL_PREFIX, TODOIST_WEB_URL_PREFIX } from "./todo-source/todoist";

export const CALENDAR_DB = resolve(homedir(), "Library/Calendars/Calendar.sqlitedb");

const defaultLimit = 1000;

const quoteEscapeAndJoin = (texts: string[]): string =>
  texts.map((text) => "'" + text.replaceAll("'", "''") + "'").join(",");

export const getCalendarQuery = (calendarNames: string[]): string => `
SELECT
  ROWID AS id,
  title
FROM
  Calendar
WHERE
  title IN (${quoteEscapeAndJoin(calendarNames)})
LIMIT 1000`;

// CalendarItem.UUID = EKCalendarItem.calendarItemIdentifier
// CalendarItem.unique_identifier = EKCalendarItem.calendarItemExternalIdentifier
// CalendarItem.external_id = {calendar path}/{unique_identifier}.ics ('@' replaced with '%40')
// 'x-apple-calevent://' || calendar_uuids.UUID || '/' || CalendarItem.UUID AS calendarItemURL - doesn't work on macOS
//
// CalendarItem.status = 3 hasn't been observed.
// - EKEventStatus.canceled = 3
// - Canceled events seem to be deleted from the database, both when I'm the organizer and when I'm not.
//
// CalendarItem.invitation_status
// - 0: normal
// - 1: no RSVP yet
// - 3: just came through
//
// Participant.status (off by 1 from EKParticipantStatus)
// - 0: pending
// - 1: accepted
// - 2: declined
// - 3: tentative
// -> Declined events are deleted from `OccurrenceCache` only if "Show Declined Events" is unchecked.
//
// `conference_url` and `conference_url_detected` are unreliable
// - Incoming Skype meeting invitations are captured in `conference_url_detected`
// - Outgoing Google Meet or even FaceTime invitations are captured in neither field.
function calItemQuery(
  calendarNames: string[],
  where: string,
  asTimeEntries?: boolean,
  forReport?: boolean,
  excludingDeclinedEvents?: boolean,
  limit?: number
): string {
  return `
WITH calendar_ids AS (
  SELECT ROWID
  FROM Calendar
  WHERE title IN (${quoteEscapeAndJoin(calendarNames)})
)
SELECT
  CalendarItem.UUID AS id,
  CalendarItem.summary AS title,
  OccurrenceCache.occurrence_date AS start,
  ${
    asTimeEntries
      ? "iif(OccurrenceCache.occurrence_date != OccurrenceCache.occurrence_end_date, OccurrenceCache.occurrence_end_date, NULL) AS end,"
      : "OccurrenceCache.occurrence_end_date AS end,"
  }
  CalendarItem.url${
    forReport
      ? `,
  CalendarItem.has_attendees AS hasAttendees,
  Participant.status AS rsvpStatus`
      : ""
  }
FROM
  OccurrenceCache
INNER JOIN
  CalendarItem ON CalendarItem.ROWID = OccurrenceCache.event_id${
    forReport || excludingDeclinedEvents
      ? `
LEFT OUTER JOIN
  Participant ON Participant.ROWID = CalendarItem.self_attendee_id`
      : ""
  }
WHERE
  OccurrenceCache.calendar_id IN calendar_ids
  AND ${where}${
    excludingDeclinedEvents
      ? `
  AND (
    Participant.status ISNULL
    OR Participant.status != 2
  )`
      : ""
  }
ORDER BY
  OccurrenceCache.occurrence_date ASC
LIMIT ${limit ?? defaultLimit}`;
}

const epochToRef = 978307200;

const toTimeIntervalSinceReferenceDate = (timeValue: number) => timeValue * 1e-3 - epochToRef;
const toJavaScriptTimeValue = (timeIntervalSinceReferenceDate: number) =>
  (timeIntervalSinceReferenceDate + epochToRef) * 1_000;

// WARNING: `id` isn't unique if multiple occurrences of a recurring event is returned. If calendar items need to be
// mapped to `List.Item`s, create a unique key using `occurrence_date` (see `report.toEventReportItem()`).
//
// Parameters:
// - `blocksOnly`: If `true`, returns events whose `url`s start with certain schemes, e.g., "things://"
export function getCalItemQuery({
  calendars,
  ids,
  url,
  urlIncludes,
  runningTimerOnly,
  interval,
  blocksOnly,
  asTimeEntries,
  forReport,
}: {
  calendars: string[];
  ids?: string[];
  url?: string;
  urlIncludes?: string;
  runningTimerOnly?: boolean;
  interval?: { start: number; end: number };
  blocksOnly?: boolean;
  asTimeEntries?: boolean;
  forReport?: boolean;
}): string {
  if (calendars.length === 0) return "";

  // CalendarItem.url LIKE 'raycast://extensions/benyn/daily-planner/%'
  const whereBlock = `
  AND (
    CalendarItem.url LIKE '${TASK_BLOCK_DEEPLINK_PREFIX}%'
    OR CalendarItem.url LIKE '${BREAK_BLOCK_DEEPLINK}%'
    OR CalendarItem.url LIKE '${REMINDERS_URL_PREFIX}%'
    OR CalendarItem.url LIKE '${THINGS_URL_PREFIX}%'
    OR CalendarItem.url LIKE '${TODOIST_APP_URL_PREFIX}%'
    OR CalendarItem.url LIKE '${TODOIST_WEB_URL_PREFIX}%'
  )`;

  if (ids) {
    const where = `id IN (${quoteEscapeAndJoin(ids)})` + (blocksOnly ? whereBlock : "");
    return calItemQuery(calendars, where, asTimeEntries, forReport, false, ids.length);
  }

  if (url || urlIncludes) {
    const whereURL = url ? `CalendarItem.url = '${url}'` : "";
    const whereURLIncludes = urlIncludes ? `CalendarItem.url LIKE '%${urlIncludes}%'` : "";
    const where =
      whereURL && whereURLIncludes
        ? `(
    ${whereURL}
    OR ${whereURLIncludes}
  )`
        : whereURL + whereURLIncludes;
    return calItemQuery(calendars, where, asTimeEntries, forReport);
  }

  if (runningTimerOnly) {
    const where = "OccurrenceCache.occurrence_date = OccurrenceCache.occurrence_end_date";
    return calItemQuery(calendars, where, asTimeEntries, forReport);
  }

  if (interval) {
    const { start, end } = interval;
    const startValue = toTimeIntervalSinceReferenceDate(start);
    const endValue = toTimeIntervalSinceReferenceDate(end);
    const whereInterval = `OccurrenceCache.occurrence_end_date > ${startValue}
  AND OccurrenceCache.occurrence_date <= ${endValue}
  AND CalendarItem.all_day = 0`;
    const whereIntervalPlusRunningTimeEntries = `(
    (${whereInterval}
    )
    OR OccurrenceCache.occurrence_date = OccurrenceCache.occurrence_end_date
  )
`;
    const where =
      (asTimeEntries ? whereIntervalPlusRunningTimeEntries : whereInterval) + (blocksOnly ? whereBlock : "");
    return calItemQuery(calendars, where, asTimeEntries, forReport, !blocksOnly);
  }

  return "";
}

// Adjust reference date-based time values from Calendar database to the UNIX/ECMAScript epoch-based time values.
// If done in SQLite, these calculations may result in an error of ~0.002, even without `* 1000`.
export function toEpochBasedDates<T extends { start: number; end: number | null }>(item: T): T {
  return {
    ...item,
    start: toJavaScriptTimeValue(item.start),
    end: item.end ? toJavaScriptTimeValue(item.end) : item.end,
  };
}
