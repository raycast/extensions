import { getErrorMessage, showError } from "@chrismessina/raycast-kit";
import { Action, Icon, Keyboard, showInFinder } from "@raycast/api";
import { access } from "fs/promises";

/**
 * "Show in Finder" that survives a path which no longer exists.
 *
 * `Action.ShowInFinder` calls `realpath` internally and throws an **unhandled**
 * `ENOENT` when the target is gone, which Raycast renders as a full-screen error
 * with a JavaScript stack trace — see the crash observed 2026-07-25 on a project
 * folder that had been moved.
 *
 * This matters on real data, not just test fixtures: the index stores the `cwd`
 * an artifact was published from, and directories get renamed, archived, and
 * deleted long before the artifact is forgotten. Stale paths are the expected
 * steady state, so the failure has to be a toast the user can act on.
 */
export function RevealInFinderAction({
  title,
  path,
  icon = Icon.Finder,
  shortcut,
}: {
  title: string;
  path: string;
  icon?: Icon;
  shortcut?: Keyboard.Shortcut;
}) {
  return (
    <Action
      title={title}
      icon={icon}
      shortcut={shortcut}
      onAction={async () => {
        try {
          // Check before revealing, so a missing path becomes a toast instead of
          // an unhandled rejection inside Raycast's own realpath call.
          await access(path);
          await showInFinder(path);
        } catch (error) {
          const missing = getErrorMessage(error).includes("ENOENT");

          await showError(error, {
            title: missing ? "Folder Not Found" : "Could Not Show in Finder",
            // A raw ENOENT string names the syscall, which tells the user
            // nothing actionable; say what actually happened instead. Any other
            // failure keeps the kit's derived message, which is the real cause.
            message: missing ? "The folder has been moved, renamed, or deleted." : undefined,
            // The path is what a bug report needs, and it lands on the clipboard
            // rather than crowding the toast.
            copyContext: path,
          });
        }
      }}
    />
  );
}
