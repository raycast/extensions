import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOnCallCalendars, getCalendarEvents, type Calendar } from "../api/betterstack-api";
import { OnCallEvent, resolveOverrideConflicts } from "../domain/on-call-event";

export interface OnCallData {
  events: OnCallEvent[];
  scheduleName: string;
  isLoading: boolean;
  noSchedule: boolean;
  hasError: boolean;
}

export function useOnCallData(): OnCallData {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<OnCallEvent[]>([]);
  const [scheduleName, setScheduleName] = useState("");
  const [noSchedule, setNoSchedule] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { calendars, usersByEmail } = await getOnCallCalendars();
        const primary = findPrimarySchedule(calendars);

        if (!primary) {
          setNoSchedule(true);
          setIsLoading(false);
          return;
        }

        setScheduleName(primary.attributes.name ?? "Primary");

        const calEvents = await getCalendarEvents(primary.id, usersByEmail);

        setEvents(resolveOverrideConflicts(calEvents));
      } catch (error) {
        setHasError(true);
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load on-call schedule",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return { events, scheduleName, isLoading, noSchedule, hasError };
}

function findPrimarySchedule(calendars: Calendar[]): Calendar | undefined {
  const exactPrimary = calendars.find((calendar) => calendar.attributes.name?.trim().toLowerCase() === "primary");
  if (exactPrimary) return exactPrimary;

  const defaultCalendar = calendars.find((calendar) => calendar.attributes.default_calendar);
  if (defaultCalendar) return defaultCalendar;

  return calendars.find((calendar) => calendar.attributes.name?.toLowerCase().includes("primary"));
}
