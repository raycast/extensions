import type { Event, Session } from "./types";
import { createSession, getCurrentSession, removeCurrentSession, saveSession, setCurrentSession } from "./sessions";
import { getEvents } from "./events";

/*
 * The "Refresh Data" command is responsible for refreshing the data related to
 * the focus sessions in the background.
 */
export default async function Command() {
  // List of events that the refresh command was able to pick up from MacOS's
  // System Log.
  const events: Event[] = getEvents();

  // For 'start' events we'll want to:
  // 1. Create a new `Session` object with the same information as the event's
  // information
  // 2. Cache that `Session` into the cache as the current session
  //
  // For 'summary' events we'll want to:
  // 1. Retrieve the current session from cache
  // 2. Update the session's duration with the duration from the event
  // 3. Save the session to the database
  // 4. Clear the cache
  for (const event of events) {
    if (event.type === "start") {
      const session = createSession(event.start, event.goal);
      setCurrentSession(session);
    } else if (event.type === "summary") {
      const cachedSession = getCurrentSession();

      if (cachedSession === null) {
        console.error("No current session found when processing summary event");
        continue;
      }

      const session: Session = { ...cachedSession, duration: event.duration };
      saveSession(session);
      removeCurrentSession();
    }
  }
}
