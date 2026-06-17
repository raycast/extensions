import { Action, Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { fetchItemInput } from "../util/input";
import { handleLiveTemplate, runShortcut, Shortcut } from "../util/shortcut";

export function ActionRunShortcut(props: {
  primaryAction: string;
  closeMainWindow: boolean;
  shortcut: Shortcut;
  visitItem: (item: Shortcut) => void;
}) {
  const { primaryAction, closeMainWindow, shortcut, visitItem } = props;
  const tactions = shortcut.tactions;
  return (
    <>
      <Action
        title={primaryAction === "Paste" ? "Paste to Active App" : "Copy to Clipboard"}
        icon={primaryAction === "Paste" ? Icon.Window : Icon.Clipboard}
        onAction={async () => {
          visitItem(shortcut);
          const _runShortcut = runShortcut(await fetchItemInput(), handleLiveTemplate(tactions));
          if (primaryAction === "Paste") {
            await Clipboard.paste(_runShortcut);
            if (closeMainWindow) {
              await showHUD("Pasted result to active app");
            } else {
              await showToast(Toast.Style.Success, "Pasted result to active app!");
            }
          } else {
            await Clipboard.copy(_runShortcut);
            if (closeMainWindow) {
              await showHUD("Copy result to clipboard");
            } else {
              await showToast(Toast.Style.Success, "Copy result to clipboard!");
            }
          }
        }}
      />
      <Action
        title={primaryAction === "Copy" ? "Paste to Active App" : "Copy to Clipboard"}
        icon={primaryAction === "Copy" ? Icon.Window : Icon.Clipboard}
        onAction={async () => {
          visitItem(shortcut);
          const _runShortcut = runShortcut(await fetchItemInput(), handleLiveTemplate(tactions));
          if (primaryAction === "Copy") {
            await Clipboard.paste(_runShortcut);
            if (closeMainWindow) {
              await showHUD("Copy result to clipboard");
            } else {
              await showToast(Toast.Style.Success, "Copy result to clipboard!");
            }
          } else {
            await Clipboard.copy(_runShortcut);
            if (closeMainWindow) {
              await showHUD("Paste result to active app");
            } else {
              await showToast(Toast.Style.Success, "Paste result to active app!");
            }
          }
        }}
      />
    </>
  );
}
