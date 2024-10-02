import "./initSentry";

import { closeMainWindow, open, showHUD } from "@raycast/api";
import { Span, startInactiveSpan } from "@sentry/react";
import { ApiResponseEvents, ApiResponseMoment } from "./hooks/useEvent.types";
import { getOriginalEventIDFromSyncEvent } from "./utils/events";
import { fetchPromise } from "./utils/fetcher";
import { captureInSpan, errorCoverage } from "./utils/sentry";

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
const joinMeeting = async (event: ApiResponseMoment["event"], span: Span) => {
  const _span = startInactiveSpan({ name: "join-meeting", parentSpan: span });

  if (!event) return false;

  // If event has a meeting URL, open it
  if (event.onlineMeetingUrl) {
    await open(event.onlineMeetingUrl);
    return true;
  } else {
    // Check if event is a synced event and get the original event id
    const id = errorCoverage(span, () => getOriginalEventIDFromSyncEvent(event));
    if (!id) return false;

    // try fetching original event
    const [eventRequest] = await fetchPromise<ApiResponseEvents[number]>(`/events/${id}`, {
      sentrySpan: _span,
    });

    if (!eventRequest) {
      captureInSpan(_span, new Error(`/events/${id} returned with empty response`));
      return false;
    }

    if (eventRequest.onlineMeetingUrl) {
      try {
        await open(eventRequest.onlineMeetingUrl);
      } catch (cause) {
        captureInSpan(_span, new Error(`Failed to open: ${eventRequest.onlineMeetingUrl}`));
      }
      return true;
    }
  }
  return false;
};

export default async function Command() {
  const span = startInactiveSpan({ name: "join-meeting" });

  try {
    await closeMainWindow();
  } catch (cause) {
    const error = new Error("Could not close main window", { cause });
    captureInSpan(span, error);
    await showHUD("Something went wrong...");
    return;
  }

  await showHUD("Joining meeting...");

  const [momentRequest] = await fetchPromise<ApiResponseMoment>(`/moment/next`, { sentrySpan: span });

  if (!momentRequest) {
    captureInSpan(span, new Error("Moment returned empty response"));
    await showHUD("Error getting the next event");
    return;
  }

  // if event does not succeed, try next event
  if (!(await joinMeeting(momentRequest.event, span))) {
    await showHUD("No meetings found.");
  }
}
