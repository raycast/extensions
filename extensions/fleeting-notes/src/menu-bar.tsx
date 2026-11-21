import { Clipboard, Icon, LaunchType, MenuBarExtra, environment, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { ScratchpadStore } from "./lib/storage";

export default function ScratchpadMenuBar() {
  const [pad] = useState(() => {
    try {
      return { text: new ScratchpadStore(environment.supportPath).read().current.text, error: undefined };
    } catch {
      return { text: "", error: "Could not read the saved scratchpad" };
    }
  });
  return (
    <MenuBarExtra icon={Icon.Pencil} tooltip="Fleeting Notes">
      <MenuBarExtra.Item
        title="Open Scratchpad"
        icon={Icon.Pencil}
        onAction={async () => {
          try {
            await launchCommand({ name: "scratchpad", type: LaunchType.UserInitiated });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Scratchpad" });
          }
        }}
      />
      <MenuBarExtra.Item
        title={pad.error ?? (pad.text ? "Copy Scratchpad" : "Scratchpad Is Empty")}
        icon={Icon.Clipboard}
        onAction={async () => {
          if (pad.error) {
            await showFailureToast(pad.error, { title: "Could Not Copy Scratchpad" });
          } else if (pad.text) {
            await Clipboard.copy(pad.text);
          }
        }}
      />
    </MenuBarExtra>
  );
}
