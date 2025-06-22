import type { NewSession } from "./types";
import { createSession, getCurrentSession, removeCurrentSession, saveSession, setCurrentSession } from "./sessions";
import { getEvents } from "./events";
import { ensureInitialized } from "./lib/init/tasks";
import { showToast, Toast, LaunchProps, LaunchType, showHUD } from "@raycast/api";

// When the command was launched manually by the user, display a message in
// Raycast's Toast. Otherwise the command was run in the background and
// we'll display the error in the HUD instead.
function showError(title: string, launchType: LaunchType) {
  if (launchType === LaunchType.UserInitiated) {
    return showToast({ style: Toast.Style.Failure, title });
  }

  return showHUD(title);
}

/*
 * The "Refresh Data" command is responsible for refreshing the data related to
 * the focus sessions in the background.
 */
export default async function Command(props: LaunchProps) {
  try {
    // Ensure the extension is properly initialized before proceeding
    const initialized = await ensureInitialized();

    if (!initialized) {
      return showError("Failed to initialize database. Aborting sync.", props.launchType);
    }

    const events = getEvents();

    for (const event of events) {
      try {
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
      } catch (error) {
        console.error(`Error processing event:`, error, event);
      }
    }

    // When the command was launched manually by the user, display a message in
    // Raycast's Toast.
    if (props.launchType === LaunchType.UserInitiated) {
      return await showToast({ style: Toast.Style.Success, title: `Synced ${events.length} Raycast Focus Events` });
    }
  } catch (error) {
    console.error("Fatal error in sync command:", error);
    return showError(`Failed Syncing Raycast Focus Events`, props.launchType);
  }
}
