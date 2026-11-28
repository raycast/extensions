import { LaunchType, launchCommand } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

// Music takes a moment to report the new track after a skip or play/pause.
const SETTLE_MS = 500;

/**
 * Asks the menu bar player to refresh now instead of waiting for its next
 * interval run. Does nothing if that command is disabled or fails to launch.
 */
export const refreshMenuBar = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  await launchCommand({ name: "currently-playing-menu-bar", type: LaunchType.Background }).catch(() => undefined);
};

/** Runs a refresh after a successful action. Failures leave the menu bar alone. */
export const withMenuBarRefresh = <E, A>(te: TE.TaskEither<E, A>): TE.TaskEither<E, A> =>
  pipe(
    te,
    TE.chainFirstTaskK(() => refreshMenuBar),
  );
