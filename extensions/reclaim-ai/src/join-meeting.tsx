import { closeMainWindow, getPreferenceValues, open, showHUD } from "@raycast/api";
import { ApiResponseEvents, ApiResponseMoment } from "./hooks/useEvent.types";
import { NativePreferences } from "./types/preferences";
import { axiosPromiseData, fetcher } from "./utils/axiosPromise";
import { getOriginalEventIDFromSyncEvent } from "./utils/events";
/**
 * This function is used to join a meeting.
 * If it succeeds, it returns true.
 * It first checks if the event has a meeting URL, if it does, it opens it.
 * If not, it checks if the event is a synced event and gets the original event id.
 * It then tries to fetch the original event.
 * If the original event has a meeting URL, it opens it.
 * If not, it returns false.
 *
 * @param {ApiResponseMoment["event"] | ApiResponseMoment["nextEvent"]} event - The event to join.
 * @returns {Promise<boolean>} - Returns a promise that resolves to a boolean indicating whether the meeting was joined successfully.
 */
const joinMeeting = async (event: ApiResponseMoment["event"] | ApiResponseMoment["nextEvent"]) => {
  const { apiUrl } = getPreferenceValues<NativePreferences>();
  if (!event) return false;

  // If event has a meeting URL, open it
  if (event.onlineMeetingUrl) {
    await open(event.onlineMeetingUrl);
    return true;
  } else {
    // Check if event is a synced event and get the original event id
    const id = getOriginalEventIDFromSyncEvent(event);
    if (!id) return false;

    // try fetching original event
    const [eventRequest, eventError] = await axiosPromiseData<ApiResponseEvents[number]>(
      fetcher(`${apiUrl}/events/${id}`)
    );

    if (eventError || !eventRequest) {
      console.error(eventError);
      return false;
    }

    if (eventRequest.onlineMeetingUrl) {
      await open(eventRequest.onlineMeetingUrl);
      return true;
    }
  }
  return false;
};

export default async function Command() {
  const { apiUrl } = getPreferenceValues<NativePreferences>();

  await closeMainWindow();
  await showHUD("Joining meeting...");

  const [momentRequest, momentError] = await axiosPromiseData<ApiResponseMoment>(fetcher(`${apiUrl}/moment/next`));

  if (momentError || !momentRequest) {
    console.error(momentError);
    await showHUD("Error getting the next event");
    return;
  }
  // if event does not succeed, try next event
  if (!(await joinMeeting(momentRequest.event))) {
    if (!(await joinMeeting(momentRequest.nextEvent))) {
      await showHUD("No meetings found.");
    }
  }
}
