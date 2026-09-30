import type { NewSession } from "./types";
import { createSession, getCurrentSession, removeCurrentSession, saveSession, setCurrentSession } from "./sessions";
import { getEvents } from "./events";
import { needsInitialization, getInitializationReason } from "./lib/init/tracking";
import { showToast, Toast, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { lock } from "proper-lockfile";
import { DatabasePath } from "./lib/db";

/**
 * Display an error message to the user based on how the command was launched.
 *
 * When the command was launched manually by the user, display a message in
 * Raycast's Toast. Otherwise, when the command was run in the background this
 * displays the error in the HUD instead.
 *
 * @param title - The error message to display
 * @param launchType - How the command was launched (`UserInitiated` or `Background`)
 * @returns Promise from either `showToast` or `showHUD`
 */
function showError(title: string, launchType: LaunchType) {
  if (launchType === LaunchType.UserInitiated) {
    return showToast({ style: Toast.Style.Failure, title });
  }

  return showHUD(`Raycast Focus Stats: ${title}`);
}

/**
 * The "Sync Sessions" command is responsible for synchronizing Focus session data
 * from macOS system logs into the extension's database.
 *
 * This command:
 * 1. Reads Focus session events from macOS system logs
 * 2. Processes "start" events to create pending sessions
 * 3. Processes "summary" events to complete and save sessions
 * 4. Uses file locking to prevent concurrent executions
 *
 * The command can be run manually by the user or automatically in the background.
 * It requires the database to be initialized before it can run. If the database
 * is not yet initialized, it'll display an error message informing the user to
 * run one of the other commands first.
 *
 * @param props - Launch properties including how the command was triggered
 */
export default async function Command(props: LaunchProps) {
  // The extension requires an that the SQLite database has been initialized, in
  // order to be able to store sessions.
  // If the database doesn't exist or needs migrations, the user must run
  // another command first to set it up.
  // This is done because the initialization function was causing errors when
  // running in the "Sync Sessions" command, in a background fashion. Since a
  // fix was not found, this is the best that could be done until a better
  // solution is found.
  if (needsInitialization()) {
    return showError(getInitializationReason(), props.launchType);
  }

  // The `proper-lockfile` is used to ensure only one sync process runs at a
  // time in order to prevent race conditions regarding reading and writing
  // session data.
  // Since the file needs to exist before the `lock` function is called, we'll
  // simply use the database path, as the initialization check that runs before
  // confirms that the file exists. The `proper-lockfile` depdency will create a
  // `${file}.lock/` folder to serve as the lockfile, so it won't touch the
  // database file itself.
  await lock(DatabasePath)
    .then(async (release) => {
      const events = getEvents();

      for (const event of events) {
        if (event.type === "start") {
          const session = createSession(event.start, event.goal);
          setCurrentSession(session);
        } else if (event.type === "summary") {
          const cachedSession = getCurrentSession();

          if (cachedSession === null) {
            // This edge-case can happen if:
            //
            // - The extension was installed after a session started
            // - The cache was cleared between start and summary events
            // - There's a bug in Raycast's logging
            //
            // In any case, there's no way to recover from this, so we'll just
            // skip the summary event.
            console.error("No current session found when processing summary event");
            continue;
          }

          const session: NewSession = { ...cachedSession, duration: event.duration };
          await saveSession(session);
          removeCurrentSession();
        }
      }

      // Only show a toast notification when the user manually triggered the
      // sync. Background syncs should be silent to avoid interrupting the user.
      if (props.launchType === LaunchType.UserInitiated) {
        return await showToast({ style: Toast.Style.Success, title: `Synced ${events.length} Raycast Focus Events` });
      }

      // Release the lock so another instance of "Sync Sessions" can run.
      return release();
    })
    .catch(async (error) => {
      // If we fail to acquire the lock, this should mean another sync process
      // is already running.
      // This is expected behavior, not an error condition, but we'll still show
      // an error to the user, informing that another instance is already
      // running.
      console.error("Failed to obtain lock", error);
      return await showError("Another instance of Sync Sessions is already running", props.launchType);
    });
}
