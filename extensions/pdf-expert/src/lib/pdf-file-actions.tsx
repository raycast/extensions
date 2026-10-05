import {
  Action,
  Clipboard,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { revealInFinder } from "./pdf-expert";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function RevealInFinderAction({ path }: { path: string }) {
  return (
    <Action
      title="Reveal in Finder"
      icon={Icon.Finder}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      onAction={async () => {
        try {
          revealInFinder(path);
        } catch (err) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Reveal File",
            message: errorMessage(err),
          });
        }
      }}
    />
  );
}

export function CopyFileAction({ path }: { path: string }) {
  return (
    <Action
      title="Copy File to Clipboard"
      icon={Icon.Document}
      shortcut={Keyboard.Shortcut.Common.CopyName}
      onAction={async () => {
        try {
          await Clipboard.copy({ file: path });
          await showHUD("File copied");
        } catch (err) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Copy File",
            message: errorMessage(err),
          });
        }
      }}
    />
  );
}
