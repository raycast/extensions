import type { NewSession } from "./types";
import { createSession, getCurrentSession, removeCurrentSession, saveSession, setCurrentSession } from "./sessions";
import { getEvents } from "./events";
import { needsInitialization, getInitializationReason } from "./lib/init/tracking";
import { showToast, Toast, LaunchProps, LaunchType, showHUD } from "@raycast/api";

// When the command was launched manually by the user, display a message in
// Raycast's Toast. Otherwise the command was run in the background and
// we'll display the error in the HUD instead.
function showError(title: string, launchType: LaunchType) {
  if (launchType === LaunchType.UserInitiated) {
    return showToast({ style: Toast.Style.Failure, title });
  }

  return showHUD(`Raycast Focus Stats: ${title}`);
}

/*
 * The "Refresh Data" command is responsible for refreshing the data related to
 * the focus sessions in the background.
 */
export default async function Command(props: LaunchProps) {
  // If the extension's database needs to be initialized, or new migrations need
  // to be run, display an error message, informing the user to run one of the
  // other commands first.
  if (needsInitialization()) {
    const reason = getInitializationReason();

    console.error("Initialization needed:", reason);
    return showError(reason, props.launchType);
  }

  const events = getEvents();

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

      const session: NewSession = { ...cachedSession, duration: event.duration };
      await saveSession(session);
      removeCurrentSession();
    }
  }

  // When the command was launched manually by the user, display a message in
  // Raycast's Toast.
  if (props.launchType === LaunchType.UserInitiated) {
    return await showToast({ style: Toast.Style.Success, title: `Synced ${events.length} Raycast Focus Events` });
  }
}
