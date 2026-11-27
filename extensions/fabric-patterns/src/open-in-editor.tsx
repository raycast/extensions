import { Action, closeMainWindow, Icon, type Keyboard, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { openInEditorArgv } from "../lib/macos";
import { errorText } from "./deliver";

/**
 * Opens a file in the default text editor (`open -t`), not the app that owns its
 * extension: a pattern's system.md would otherwise open in a Markdown previewer.
 */
export function OpenInEditor({ target, shortcut }: { target: string; shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title="Open in Editor"
      icon={Icon.Document}
      shortcut={shortcut}
      onAction={() => {
        const [cmd, args] = openInEditorArgv(target);
        execFile(cmd, args, async (err) => {
          if (err) await showToast({ style: Toast.Style.Failure, title: "Couldn't open it", message: errorText(err) });
          else await closeMainWindow();
        });
      }}
    />
  );
}
