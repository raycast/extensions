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

  async function allowDockOnDisplay(displayName: string): Promise<void> {
    const movable = await isDockMovable();
    if (!movable) {
      showFailureToast("", { title: "Dock move not allowed for this mode." });
      return;
    }

    const result = spawnSync(
      "/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus",
      ["allow", "--display", displayName, "on"],
      { encoding: "utf8" },
    );

    if (result.status === 0) {
      await showToast(Toast.Style.Success, `Allowed Dock on display: ${displayName}`);
      await closeMainWindow();
    } else {
      const stderr = result.stderr?.trim() || "Unknown error";
      const exitCode = result.status ?? "unknown";
      console.error(`Command 'allow --display "${displayName}" on' failed`, {
        exitCode: String(exitCode),
        stdout: result.stdout?.trim(),
        stderr,
      });
      await showFailureToast(stderr, { title: `Failed to allow Dock (exit code ${exitCode})` });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select display to allow Dock appearance">
      {displays.map((display) => (
        <List.Item
          key={display.name}
          title={display.name}
          subtitle={`x:${display.geometry.x} y:${display.geometry.y} ${display.geometry.width}x${display.geometry.height}`}
          actions={
            <ActionPanel>
              <Action title="Allow Dock on This Display" onAction={() => allowDockOnDisplay(display.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
