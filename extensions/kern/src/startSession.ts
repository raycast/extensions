import { showHUD, getPreferenceValues, environment } from "@raycast/api";
import {
  showOsNotificiation,
  sessionFinished,
  handleError,
  log,
} from "./utilities";
import type { Preferences, SessionArguments } from "./types";
import { addSession, getSession, updateSession } from "./store";

const startSession = async (props: { arguments: SessionArguments }) => {
  const { name, duration: customDuration } = props.arguments;
  const { sessionDuration: defaultDuration, notificationSound } =
    getPreferenceValues<Preferences>();

  /** Generate data needed for a session. */
  const startTime = Date.now();
  /** Use customDuration if present, otherwise use short duratin during development. */
  const _sessionDuration = customDuration
    ? parseInt(customDuration) * 60 * 1000
    : environment.isDevelopment
    ? 4000
    : parseInt(defaultDuration) * 60 * 1000;

  /** Add session. */
  const { data: session, error } = await addSession({
    name: name || "Focus Session",
    startTime,
  });
  if (error) {
    handleError("Could not decode stored session records!");
    return;
  }

  if (session) {
    /** Start session. */
    await showHUD("🦉 Focus Session Started!");
    await sessionFinished(_sessionDuration);

    /** Close session */
    const { data } = await getSession(session.id);
    log("warn", JSON.stringify(data));
    if (data && !data.endTime) {
      /** Do this only if session is not close yet. */
      const endTime = Date.now();
      const { error: _error } = await updateSession({
        ...session,
        endTime,
        duration: endTime - startTime,
      });
      if (_error) {
        handleError("Could not update the running session.");
        return;
      }

      await showOsNotificiation({
        title: "🦉 Focus Session Finished!",
        // subtitle: "Awesome! You just finished your first session.",
        message: "Do yourself a favor and take a break. 💌",
        soundName: notificationSound,
      });
    } else {
      log("warn", `Session with id ${session.id} already closed.`);
    }
  }
};

export default startSession;
