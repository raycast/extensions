import { showFailureToast } from "@raycast/utils";
import { List, ActionPanel, Action, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { spawnSync } from "child_process";
import { getDisplays, isDockLockPlusInstalled, isDockMovable } from "./utils";

interface DisplayInfo {
  name: string;
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dockVisible: boolean;
  dockMovable: boolean;
}

export default function Command() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDisplays() {
      if (!isDockLockPlusInstalled()) {
        await showFailureToast("", {
          title: "DockLock Plus not installed. Install it at https://docklockpro.com",
        });
        setIsLoading(false);
        return;
      }

      const movable = await isDockMovable();
      if (!movable) {
        await showFailureToast("", { title: "Dock move not allowed for this mode." });
        setIsLoading(false);
        return;
      }

      const data = await getDisplays();
      const movableDisplays = data.filter((d) => d.dockMovable !== false);
      setDisplays(movableDisplays);
      setIsLoading(false);
    }

    loadDisplays();
  }, []);

  async function disallowDockOnDisplay(displayName: string) {
    const result = spawnSync(
      "/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus",
      ["allow", "--display", displayName, "off"],
      { encoding: "utf8" },
    );

    if (result.status === 0) {
      await showToast(Toast.Style.Success, `Disallowed Dock on display: ${displayName}`);
      await closeMainWindow();
    } else {
      const exitCode = result.status;
      const stdout = (result.stdout ?? "").toString().trim();
      const stderr = (result.stderr ?? "").toString().trim();
      console.error(`Command 'allow --display "${displayName}" off' failed`, {
        exitCode: String(exitCode),
        stdout,
        stderr,
      });
      await showFailureToast(stderr, { title: `Failed to disallow Dock (exit code ${exitCode})` });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select display to disallow Dock appearance">
      {displays.map((display) => (
        <List.Item
          key={display.name}
          title={display.name}
          subtitle={`x:${display.geometry.x} y:${display.geometry.y} ${display.geometry.width}x${display.geometry.height}`}
          actions={
            <ActionPanel>
              <Action title="Disallow Dock on This Display" onAction={() => disallowDockOnDisplay(display.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
