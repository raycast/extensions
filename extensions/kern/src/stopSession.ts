import { getMostRecentSession, updateSession } from "./store";
import { handleError, log, showOsNotificiation } from "./utilities";
import { getPreferenceValues } from "@raycast/api";
import type { Preferences } from "./types";

const stopSession = async () => {
  const { data: session, error } = await getMostRecentSession();

  log("info", `Most recent session id is: ${session?.id}`);

  if (error) {
    handleError("Could not get most recent session.");
    return;
  }

  if (session) {
    const { notificationSound } = getPreferenceValues<Preferences>();

    if (session.endTime) {
      handleError("Could not find a running session.");
      return;
    }

    /** Close session */
    const endTime = Date.now();
    const { error: _error } = await updateSession({ ...session, endTime, duration: endTime - session.startTime });

    if (_error) {
      log("error", `Could not set endTime and duration for session with id ${session.id}`);
      handleError("Could not update the running session.");
      return;
    }

    log("info", `Session with stopped: ${JSON.stringify(session)}`);
    await showOsNotificiation({
      title: "🦉 Focus Session Stopped!",
      // subtitle: "Awesome! You just finished your first session.",
      message: "Do yourself a favor and take a break. 💌",
      soundName: notificationSound,
    });
  }
};

export default stopSession;
