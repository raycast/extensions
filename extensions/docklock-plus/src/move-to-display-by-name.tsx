import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";

import { getDisplayNames, isDockLockPlusInstalled } from "./utils";

export default function Command() {
  const [displays, setDisplays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const inst = isDockLockPlusInstalled();
    if (!inst) {
      showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
      setIsLoading(false);
      return;
    }
    const names = getDisplayNames();
    setDisplays(names);
    setIsLoading(false);
  }, []);

  function moveDockToDisplay(display: string) {
    exec(`open "docklockplus://moveToDisplay?name=${encodeURIComponent(display)}"`);
    showToast(Toast.Style.Success, "Dock moved", `The Dock was moved to display: ${display}`);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select display to move the Dock">
      {displays.map((display) => (
        <List.Item
          key={display}
          title={display}
          actions={
            <ActionPanel>
              <Action title="Move Dock to This Display" onAction={() => moveDockToDisplay(display)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
