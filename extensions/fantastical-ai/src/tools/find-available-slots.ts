import { getAccessToken } from "../google-auth";

type Input = {
  /**
   * Duration of the event in minutes.
   * Example: 30, 60, 90, 120
   */
  durationMinutes: number;

  /**
   * The earliest date to search from, in YYYY-MM-DD format.
   * Example: "2026-03-18"
   */
  fromDate: string;

  /**
   * The latest date to search until, in YYYY-MM-DD format.
   * Defaults to 5 business days after fromDate if not specified.
   * Example: "2026-03-22"
   */
  toDate?: string;

  /**
   * Earliest hour of the day to consider (0-23, in user's local time).
   * Defaults to 9 (9 AM).
   */
  dayStartHour?: number;

  /**
   * Latest hour of the day to consider (0-23, in user's local time).
   * Defaults to 17 (5 PM).
   */
  dayEndHour?: number;

  /**
   * Email addresses of people to check availability for.
   * If empty, only checks the authenticated user's calendar.
   * Example: ["john@company.com", "sarah@company.com"]
   */
  attendeeEmails?: string[];
};

interface FreeBusyResponse {
  calendars: Record<
    string,
    {
      busy: { start: string; end: string }[];
      errors?: { domain: string; reason: string }[];
    }
  >;
}

interface TimeSlot {
  date: string;
  start: string;
  end: string;
  dayOfWeek: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return minutes === 0
    ? `${h}:00 ${period}`
    : `${h}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${DAYS[date.getDay()]}, ${months[date.getMonth()]} ${day}, ${year}`;
}

export default async function (input: Input) {
  try {
    const accessToken = await getAccessToken();

    const fromDate = input.fromDate;
    const toDate = input.toDate || addDays(fromDate, 7);
    const dayStart = input.dayStartHour ?? 9;
    const dayEnd = input.dayEndHour ?? 17;
    const duration = input.durationMinutes;

    // Build calendar IDs to check
    const calendarIds = ["primary"];
    if (input.attendeeEmails && input.attendeeEmails.length > 0) {
      for (const email of input.attendeeEmails) {
        calendarIds.push(email);
      }
    }

    // Query Google Calendar FreeBusy API
    const timeMin = `${fromDate}T00:00:00Z`;
    const timeMax = `${toDate}T23:59:59Z`;

    const freeBusyRes = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: calendarIds.map((id) => ({ id })),
        }),
      },
    );

    if (!freeBusyRes.ok) {
      const errorText = await freeBusyRes.text();
      return `Failed to query Google Calendar: ${freeBusyRes.status} ${errorText}`;
    }

    const freeBusyData = (await freeBusyRes.json()) as FreeBusyResponse;

    // Collect all busy periods across all calendars
    const allBusyPeriods: { start: Date; end: Date }[] = [];

    for (const calendarId of calendarIds) {
      const calendar = freeBusyData.calendars[calendarId];
      if (calendar && calendar.busy) {
        for (const busy of calendar.busy) {
          allBusyPeriods.push({
            start: new Date(busy.start),
            end: new Date(busy.end),
          });
        }
      }
      if (calendar && calendar.errors) {
        // If we can't read someone's calendar, note it
        for (const err of calendar.errors) {
          if (calendarId !== "primary") {
            return `Cannot read calendar for ${calendarId}: ${err.reason}. They may need to share their calendar or be in the same Google Workspace.`;
          }
        }
      }
    }

    // Sort busy periods by start time
    allBusyPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find available slots day by day
    const slots: TimeSlot[] = [];
    let currentDate = fromDate;

    while (currentDate <= toDate && slots.length < 10) {
      const date = new Date(currentDate + "T00:00:00");
      const dayOfWeek = date.getDay();

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check each 30-min increment within working hours
        for (let hour = dayStart; hour < dayEnd && slots.length < 10; hour++) {
          for (let min = 0; min < 60 && slots.length < 10; min += 30) {
            const slotStart = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate(),
              hour,
              min,
            );
            const slotEnd = new Date(
              slotStart.getTime() + duration * 60 * 1000,
            );

            // Check slot doesn't exceed working hours
            const endHour = slotEnd.getHours() + slotEnd.getMinutes() / 60;
            if (endHour > dayEnd) continue;

            // Check slot doesn't overlap with any busy period
            const isAvailable = !allBusyPeriods.some(
              (busy) => slotStart < busy.end && slotEnd > busy.start,
            );

            if (isAvailable) {
              slots.push({
                date: currentDate,
                start: formatTime(slotStart.getHours(), slotStart.getMinutes()),
                end: formatTime(slotEnd.getHours(), slotEnd.getMinutes()),
                dayOfWeek: DAYS[dayOfWeek],
              });
            }
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    if (slots.length === 0) {
      return `No available ${duration}-minute slots found between ${formatDate(fromDate)} and ${formatDate(toDate)} during ${formatTime(dayStart, 0)} - ${formatTime(dayEnd, 0)} for ${calendarIds.length === 1 ? "you" : "all attendees"}. Try expanding the date range or adjusting working hours.`;
    }

    const attendeeNote =
      calendarIds.length > 1
        ? `Available for you and ${input.attendeeEmails!.join(", ")}`
        : "Available in your calendar";

    const slotList = slots
      .map(
        (s, i) =>
          `${i + 1}. ${s.dayOfWeek}, ${formatDate(s.date)}: ${s.start} → ${s.end}`,
      )
      .join("\n");

    return `${attendeeNote} (${duration} min slots):\n\n${slotList}\n\nPick a slot number or tell me a different time range.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Failed to check availability: ${message}. Make sure you've connected your Google account.`;
  }
}
