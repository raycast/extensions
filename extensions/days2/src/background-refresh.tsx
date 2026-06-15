import {
  updateCommandMetadata,
  launchCommand,
  LaunchType,
  environment,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { google } from "./oauth";
import { fetchCalendars, fetchUpcomingAllDayEvents } from "./google-calendar";
import { getSelectedCalendarIds } from "./storage";
import { GoogleCalendar } from "./types";

async function BackgroundRefreshCommand() {
  if (environment.launchType === LaunchType.UserInitiated) {
    try {
      await launchCommand({ name: "days2", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to launch days2 command:", error);
    }
  }

  try {
    const calendars = await fetchCalendars();
    const calendarMap = new Map<string, GoogleCalendar>();
    for (const cal of calendars) {
      calendarMap.set(cal.id, cal);
    }

    const selectedIds = await getSelectedCalendarIds();
    const calIds = selectedIds ?? calendars.map((c) => c.id);

    if (calIds.length === 0) {
      await updateCommandMetadata({ subtitle: null });
      return;
    }

    const events = await fetchUpcomingAllDayEvents(calIds, calendarMap);

    if (events.length === 0) {
      await updateCommandMetadata({ subtitle: "No upcoming events" });
      return;
    }

    const nearest = events[0];
    const days = Math.abs(nearest.daysUntil);
    const daysText =
      nearest.daysUntil === 0 ? "Today" : `${days} day${days !== 1 ? "s" : ""}`;
    const subtitle = `${nearest.title} \u2013 ${daysText}`;
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Background refresh error:", error);
  }
}

export default withAccessToken(google)(BackgroundRefreshCommand);
