import { showFailureToast } from "@raycast/utils";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

import { getDisplayNames, isDockLockPlusInstalled } from "./utils";

export default function Command() {
  const [displays, setDisplays] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      if (!(await isDockLockPlusInstalled())) {
        await showFailureToast("", { title: "DockLock Plus not installed. Install it at https://docklockpro.com" });
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
    if (!/^[\w\s\-.+]+$/.test(display)) {
      await showFailureToast("", {
        title:
          "Suspicious display name rejected. Please send a screenshot of your display list to support@docklock.pro",
      });
      return;
    }
    try {
      await execAsync(`open "docklockplus://enableDockLockOnDisplay?name=${encodeURIComponent(display)}"`);
      showToast(Toast.Style.Success, `DockLock Enabled. Enabled DockLock on display: ${display}`);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to enable DockLock. Could not communicate with DockLock Plus" });
    }
  };

  return (
    <List searchBarPlaceholder="Select display to enable DockLock on">
      {displays.map((display) => (
        <List.Item
          key={display}
          title={display}
          actions={
            <ActionPanel>
              <Action title="Enable DockLock on This Display" onAction={() => moveDockToDisplay(display)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
