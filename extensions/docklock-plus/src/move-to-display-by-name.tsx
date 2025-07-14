import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

import { getDisplayNames, isDockLockPlusInstalled } from "./utils";

export default function Command() {
  const [displays, setDisplays] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDisplays() {
      const inst = await isDockLockPlusInstalled();
      if (!inst) {
        await showToast(Toast.Style.Failure, "DockLock Plus not installed", "Install it at https://docklockpro.com");
        setIsLoading(false);
        return;
      }
      const names = await getDisplayNames();
      setDisplays(names);
      setIsLoading(false);
    }

    loadDisplays();
  }, []);

  async function moveDockToDisplay(display: string) {
    if (!/^[\w\s\-.+]+$/.test(display)) {
      await showToast(
        Toast.Style.Failure,
        "Invalid Display Name",
        `Suspicious display name rejected: "${display}". Please send a screenshot of your display list to support@docklock.pro.`,
      );
      return;
    }

    try {
      await execAsync(`open "docklockplus://moveToDisplay?name=${encodeURIComponent(display)}"`);
      showToast(Toast.Style.Success, `The Dock was moved to display: ${display}`);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        `Failed to move Dock to the display: ${display}`,
        `Could not communicate with DockLock Plus. Error: ${error}`,
      );
    }
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
