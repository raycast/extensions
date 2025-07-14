import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";

import { getDisplayNames, isDockLockPlusInstalled } from "./utils";

export default function Command() {
  const [displays, setDisplays] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      if (!(await isDockLockPlusInstalled())) {
        await showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
        return;
      }
      try {
        const names = await getDisplayNames();
        setDisplays(names);
      } catch (error) {
        console.error(error);
      }
    }
    init();
  }, []);

  const moveDockToDisplay = async (display: string) => {
    exec(`open "docklockplus://enableDockLockOnDisplay?name=${encodeURIComponent(display)}"`);
    await showToast(Toast.Style.Success, "DockLock Enabled", `Enabled DockLock on display: ${display}`);
  };

  return (
    <List searchBarPlaceholder="Select display to enable DockLock on">
      {displays.map((display) => (
        <List.Item
          key={display}
          title={display}
          actions={
            <ActionPanel>
              <Action title="Enable Docklock on This Display" onAction={() => moveDockToDisplay(display)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
