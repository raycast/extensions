import { Clipboard, Icon, LaunchType, MenuBarExtra, Toast, environment, launchCommand, showToast } from "@raycast/api";
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
        onAction={() => launchCommand({ name: "scratchpad", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title={pad.error ?? (pad.text ? "Copy Scratchpad" : "Scratchpad Is Empty")}
        icon={Icon.Clipboard}
        onAction={async () => {
          if (pad.error) {
            await showToast({ style: Toast.Style.Failure, title: pad.error });
          } else if (pad.text) {
            await Clipboard.copy(pad.text);
          }
        }}
      />
    </MenuBarExtra>
  );
}
