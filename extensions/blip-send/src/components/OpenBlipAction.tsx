import { Action, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openBlip } from "../platform";

/** Brings the Blip app to the front, wherever the extension is running. */
export function OpenBlipAction({ shortcut }: { shortcut?: Keyboard.Shortcut }) {
  return (
    <Action
      title="Open Blip"
      icon={Icon.Bolt}
      shortcut={shortcut}
      onAction={() => openBlip().catch((error) => showFailureToast(error, { title: "Could not open Blip" }))}
    />
  );
}
