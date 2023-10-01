import { calendar_v3 } from "@googleapis/calendar";
import { useCachedPromise } from "@raycast/utils";
import { getCalendarClient } from "./withCalendarClient";

export function show24hFormat(settings: calendar_v3.Schema$Settings | undefined) {
  const data = settings?.items?.find((e) => e.id === "format24HourTime");
  if (data?.value === "true") {
    return true;
  }
  return false;
}

export function useCalendarSettings() {
  const { calendar } = getCalendarClient();
  const { data } = useCachedPromise(
    async () => {
      const settings = await calendar.settings.list();
      return settings.data;
    },
    [],
    { keepPreviousData: true }
  );
  return { settings: data };
}
