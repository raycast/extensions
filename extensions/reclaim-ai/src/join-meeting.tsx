import { closeMainWindow, getPreferenceValues, open, showHUD } from "@raycast/api";
import { addDays, differenceInHours, format, isAfter, startOfDay } from "date-fns";
import { ApiResponseEvents } from "./hooks/useEvent.types";
import { ApiResponseUser } from "./hooks/useUser.types";
import { CalendarAccount } from "./types/account";
import { NativePreferences } from "./types/preferences";
import { axiosPromiseData, fetcher } from "./utils/axiosPromise";
import { filterMultipleOutDuplicateEvents } from "./utils/events";

export default async function Command() {
  const { apiUrl } = getPreferenceValues<NativePreferences>();

  await closeMainWindow();
  await showHUD("Joining meeting...");

  const [accountsResponse, accountsError] = await axiosPromiseData<CalendarAccount[]>(
    fetcher(`${apiUrl}/accounts`, {
      method: "GET",
    })
  );

  if (!accountsResponse || accountsError) {
    console.error(accountsError);
    await showHUD("Error getting the next event");
    return;
  }

  const now = new Date();

  const [eventsResponse, eventsError] = await axiosPromiseData<ApiResponseEvents>(
    fetcher(`${apiUrl}/events?sourceDetails=true`, {
      method: "GET",
      params: {
        start: format(startOfDay(now), "yyyy-MM-dd"),
        end: format(addDays(now, 1), "yyyy-MM-dd"),
        calendarIds: accountsResponse
          .flatMap(({ connectedCalendars }) => connectedCalendars.map(({ id }) => id))
          .join(","),
      },
    })
  );

  if (eventsError || !eventsResponse) {
    console.error(eventsResponse);
    await showHUD("Error getting the next event");
    return;
  }

  const [currentUser, userError] = await axiosPromiseData<ApiResponseUser>(fetcher(`${apiUrl}/users/current`));

  if (userError) {
    console.error(eventsError);
    await showHUD("Error getting the next event");
    return;
  }

  const showDeclinedEvents = !!currentUser?.settings.showDeclinedEvents;

  // Filter out events that are synced, managed by Reclaim and part of multiple calendars
  const eventsData = filterMultipleOutDuplicateEvents(eventsResponse);

  const events = eventsData
    ?.filter((event) => {
      return showDeclinedEvents ? true : event.rsvpStatus !== "Declined" && event.rsvpStatus !== "NotResponded";
    })
    .filter((event) => {
      return event.reclaimEventType !== "CONF_BUFFER" && event.reclaimEventType !== "TRAVEL_BUFFER";
    })
    .filter((event) => isAfter(new Date(event.eventEnd), now))
    .filter((event) => {
      return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
    });

  const event = events?.at(0);
  const nextEvent = events?.at(1);

  if (event?.onlineMeetingUrl) {
    await open(event.onlineMeetingUrl);
  } else {
    if (nextEvent?.onlineMeetingUrl) {
      await open(nextEvent.onlineMeetingUrl);
    } else {
      await showHUD("No meetings found.");
    }
  }
}
