import { getPreferenceValues } from "@raycast/api";
import calendarTimeTracker from "./calendarTimeTracker";
import clockifyTimeTracker from "./clockify";
import expirableStorage from "./expirableStorage";
import togglTimeTracker from "./toggl";
import { TimeTracker } from "./types";

interface Preferences {
  timeTrackingApp: string;
  timeTrackerAPIKey: string | undefined;
  timeEntryCalendar: string | undefined;
}

const { timeTrackingApp, timeTrackerAPIKey, timeEntryCalendar } = getPreferenceValues<Preferences>();

const getTimeTracker = (): [TimeTracker | null, string | null] => {
  switch (timeTrackingApp) {
    case "calendar":
      return timeEntryCalendar ? [calendarTimeTracker(timeEntryCalendar), null] : [null, "Calendar for Time Tracking"];
    case "Toggl":
      return timeTrackerAPIKey ? [togglTimeTracker(timeTrackerAPIKey), null] : [null, "Time Tracking App API Key"];
    case "Clockify":
      return timeTrackerAPIKey ? [clockifyTimeTracker(timeTrackerAPIKey), null] : [null, "Time Tracking App API Key"];
  }
  return [null, "Time Tracking App"];
};

export const [timeTracker, timeTrackerErrorPref] = getTimeTracker();
export const STORAGE_DAYS = 14;
export const timeEntryIdStorage = expirableStorage(timeTrackingApp.toLowerCase(), STORAGE_DAYS);
