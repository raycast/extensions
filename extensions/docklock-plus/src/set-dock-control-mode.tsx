import { showFailureToast } from "@raycast/utils";
import { List, ActionPanel, Action, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { spawnSync } from "child_process";

import { isDockLockPlusInstalled } from "./utils";

export default function Command() {
  const [modes] = useState([
    { title: "Lock to Selected Screens", token: "lock-selected" },
    { title: "Dock Follows Mouse", token: "follows-mouse" },
    { title: "Follow Apps When Active", token: "follows-apps" },
    { title: "Dock Follows Active Window", token: "follows-window" },
    { title: "Disable Dock Control", token: "disabled" },
  ]);

  useEffect(() => {
    async function init() {
      if (!isDockLockPlusInstalled()) {
        await showFailureToast("", {
          title: "DockLock Plus not installed. Install it at https://docklockpro.com",
        });
        return;
      }
    }
    init();
  }, []);

  const setDockControlMode = async (modeToken: string, modeTitle: string) => {
    const result = spawnSync("/Applications/DockLock Plus.app/Contents/MacOS/DockLock Plus", ["mode", modeToken], {
      encoding: "utf-8",
    });

    const exitCode = result.status ?? "unknown";
    const stdout = result.stdout?.trim() ?? "";
    const stderr = result.stderr?.trim() ?? "";

    if (exitCode === 0) {
      await showToast(Toast.Style.Success, `Dock Control Mode set to: ${modeTitle}`);
      await closeMainWindow();
    } else {
      console.error("Command failed:", { exitCode: String(exitCode), stdout, stderr });
      await showFailureToast(stderr || "Unknown error", { title: `Failed with exit code ${exitCode}` });
      await closeMainWindow();
    }
  };

  return (
    <List searchBarPlaceholder="Select Dock Control Mode">
      {modes.map((mode) => (
        <List.Item
          key={mode.token}
          title={mode.title}
          actions={
            <ActionPanel>
              <Action
                title={`Set Dock Control Mode: ${mode.title}`}
                onAction={() => setDockControlMode(mode.token, mode.title)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
