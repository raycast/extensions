import { LaunchType, launchCommand } from "@raycast/api";

/**
 * Nudges the menu-bar command so a settings change shows up there on its own.
 *
 * The menu bar is a separate command with its own cached pull requests, so
 * without this a change to the scope, the watched repos or the ignored authors
 * only lands on its next scheduled run — leaving Force Refresh as the only way
 * to see it straight away.
 */

/**
 * How long to wait for you to stop changing things before refreshing.
 *
 * Refreshing on every toggle re-renders the menu while it is open, and a row
 * that moves under a click already on its way is a misclick. Waiting for a
 * quiet moment also folds a run of toggles into one launch.
 */
const QUIET_MS = 600;

let timer: ReturnType<typeof setTimeout> | undefined;
/** Callers waiting on the pending nudge; one launch settles all of them. */
let waiting: (() => void)[] = [];
let inFlight = false;
let again = false;

async function launch(): Promise<void> {
  if (inFlight) {
    // Fold this into the launch already running, so the last change still wins.
    again = true;
    return;
  }

  inFlight = true;
  try {
    do {
      again = false;
      await launchCommand({ name: "actionablePullRequests", type: LaunchType.Background });
    } while (again);
  } catch {
    // The menu-bar command can be switched off in Raycast, and a settings
    // toggle is no place to nag about it. Its own refresh still works.
  } finally {
    inFlight = false;
  }
}

/**
 * Schedules the nudge. Resolves once the launch has been attempted, so a
 * caller that is about to disappear can wait for it; `quietMs` exists for
 * tests that would rather not wait.
 */
export function refreshMenuBar(quietMs = QUIET_MS): Promise<void> {
  if (timer) clearTimeout(timer);

  return new Promise(resolve => {
    waiting.push(resolve);
    timer = setTimeout(() => {
      timer = undefined;
      // A superseded caller is covered by this launch, so settle them all
      // rather than leaving the earlier promises pending for good.
      const settle = waiting;
      waiting = [];
      launch().then(
        () => settle.forEach(done => done()),
        () => settle.forEach(done => done()),
      );
    }, quietMs);
  });
}
