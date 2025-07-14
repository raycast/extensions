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
    if (!/^[\w\s\-.+]+$/.test(display)) {
      await showToast(
        Toast.Style.Failure,
        "Invalid Display Name",
        `Suspicious display name rejected: "${display}". Please send a screenshot of your display list to support@docklock.pro.`,
      );
      return;
    }
    try {
      await execAsync(`open "docklockplus://disableDockLockOnDisplay?name=${encodeURIComponent(display)}"`);
      showToast(Toast.Style.Success, `DockLock Disabled on display: ${display}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        `Failed to disable DockLock on display: ${display}`,
        `Could not communicate with DockLock Plus. Error: ${error}`,
      );
    }
  };

  return (
    <List searchBarPlaceholder="Select display to disable DockLock on">
      {displays.map((display) => (
        <List.Item
          key={display}
          title={display}
          actions={
            <ActionPanel>
              <Action title="Disable Docklock on This Display" onAction={() => moveDockToDisplay(display)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
