import "./initSentry";

import { closeMainWindow, open, showHUD } from "@raycast/api";
import { captureException } from "@sentry/node";
import { ApiResponseEvents, ApiResponseMoment } from "./hooks/useEvent.types";
import { getOriginalEventIDFromSyncEvent } from "./utils/events";
import { fetchPromise } from "./utils/fetcher";
import { errorCoverage } from "./utils/sentry";

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
const joinMeeting = async (event: ApiResponseMoment["event"]) => {
  if (!event) return false;

  // If event has a meeting URL, open it
  if (event.onlineMeetingUrl) {
    await open(event.onlineMeetingUrl);
    return true;
  } else {
    // Check if event is a synced event and get the original event id
    const id = errorCoverage(() => getOriginalEventIDFromSyncEvent(event));
    if (!id) return false;

    // try fetching original event
    const [eventRequest] = await fetchPromise<ApiResponseEvents[number]>(`/events/${id}`);

    if (!eventRequest) {
      captureException(new Error(`/events/${id} returned with empty response`));
      return false;
    }

    if (eventRequest.onlineMeetingUrl) {
      try {
        await open(eventRequest.onlineMeetingUrl);
      } catch (cause) {
        captureException(new Error(`Failed to open: ${eventRequest.onlineMeetingUrl}`, { cause }));
      }
      return true;
    }
  }
  return false;
};

export default async function Command() {
  try {
    await closeMainWindow();
  } catch (cause) {
    const error = new Error("Could not close main window", { cause });
    captureException(error);
    await showHUD("Something went wrong...");
    return;
  }

  await showHUD("Joining meeting...");

  const [momentRequest] = await fetchPromise<ApiResponseMoment>(`/moment/next`);

  if (!momentRequest) {
    captureException(new Error("Moment returned empty response"));
    await showHUD("Error getting the next event");
    return;
  }

  // if event does not succeed, try next event
  if (!(await joinMeeting(momentRequest.event))) {
    await showHUD("No meetings found.");
  }
}
