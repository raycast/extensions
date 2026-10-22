import {
  ActionPanel,
  Action,
  Color,
  Icon,
  List,
  closeMainWindow,
  environment,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { useState } from "react";

const execFileAsync = promisify(execFile);
const HELPER_PATH = path.join(environment.assetsPath, "window-helper");

interface RawWindowItem {
  appName?: string;
  windowTitle?: string;
  isMinimized?: boolean;
  appPath?: string;
  bundleId?: string;
  pid?: number;
  windowIndex?: number;
}

interface WindowInstance {
  id: string;
  appName: string;
  windowTitle: string;
  isMinimized?: boolean;
  appPath?: string;
  bundleId?: string;
  pid?: number;
  windowIndex?: number;
}

// Optimized fallback script when native helper binary is unavailable
const OPTIMIZED_FALLBACK_SCRIPT = `
tell application "System Events"
  set res to {}
  set procs to (every application process whose background only is false)
  repeat with p in procs
    try
      set pName to name of p
      set wNames to name of every window of p
      repeat with wName in wNames
        if wName is not missing value and (wName as text) is not "" then
          set end of res to pName & ":::" & wName
        end if
      end repeat
    end try
  end repeat
  set AppleScript's text item delimiters to ASCII character 10
  return res as text
end tell
`;

async function fetchWindows(): Promise<WindowInstance[]> {
  // 1. Try ultra-fast native helper (runs concurrently via GCD in ~100ms)
  if (fs.existsSync(HELPER_PATH)) {
    try {
      const { stdout } = await execFileAsync(HELPER_PATH, ["list"], {
        maxBuffer: 10 * 1024 * 1024,
      });
      const raw = JSON.parse(stdout.trim() || "[]");
      if (Array.isArray(raw) && raw.length > 0) {
        return (raw as RawWindowItem[]).map((item, idx) => ({
          id: `${item.appName}-${item.pid ?? idx}-${item.windowIndex ?? idx}`,
          appName: item.appName || "Unknown App",
          windowTitle: item.windowTitle || "Untitled Window",
          isMinimized: Boolean(item.isMinimized),
          appPath: item.appPath || undefined,
          bundleId: item.bundleId || undefined,
          pid: item.pid,
          windowIndex: item.windowIndex,
        }));
      }
    } catch {
      // Helper failed, seamlessly continue to fallback
    }
  }

  // 2. High-speed batch AppleScript fallback
  const stdout = await runAppleScript(OPTIMIZED_FALLBACK_SCRIPT);
  const lines = stdout.split("\n").filter(Boolean);

  return lines.map((line, idx) => {
    const [appName, ...titleParts] = line.split(":::");
    return {
      id: `${appName}-${idx}`,
      appName: appName?.trim() || "Unknown App",
      windowTitle: titleParts.join(":::")?.trim() || "Untitled Window",
    };
  });
}

export default function Command() {
  const [selectedApp, setSelectedApp] = useState<string>("all");

  const {
    isLoading,
    data: instances = [],
    revalidate,
  } = useCachedPromise(fetchWindows, [], {
    keepPreviousData: true,
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load instances",
        message:
          "Ensure Raycast has Accessibility permissions in System Settings",
      });
    },
  });

  async function focusWindow(instance: WindowInstance) {
    // Instantly close Raycast window to eliminate perceived latency
    await closeMainWindow();

    if (
      instance.pid !== undefined &&
      instance.windowIndex !== undefined &&
      fs.existsSync(HELPER_PATH)
    ) {
      try {
        await execFileAsync(HELPER_PATH, [
          "focus",
          String(instance.pid),
          String(instance.windowIndex),
          instance.windowTitle,
        ]);
        return;
      } catch {
        // Fallback to AppleScript focus below
      }
    }

    const focusScript = `
    tell application "System Events"
      tell process "${instance.appName}"
        set frontmost to true
        try
          perform action "AXRaise" of (first window whose name is "${instance.windowTitle.replace(/"/g, '\\"')}")
        end try
      end tell
    end tell
    `;
    try {
      await runAppleScript(focusScript);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not focus window",
        message: String(err),
      });
    }
  }

  async function closeWindow(instance: WindowInstance) {
    if (
      instance.pid !== undefined &&
      instance.windowIndex !== undefined &&
      fs.existsSync(HELPER_PATH)
    ) {
      try {
        await execFileAsync(HELPER_PATH, [
          "close",
          String(instance.pid),
          String(instance.windowIndex),
          instance.windowTitle,
        ]);
        showToast({
          style: Toast.Style.Success,
          title: "Window closed",
        });
        revalidate();
        return;
      } catch {
        // Continue to fallback
      }
    }

    const closeScript = `
    tell application "System Events"
      tell process "${instance.appName}"
        try
          click (first button of (first window whose name is "${instance.windowTitle.replace(/"/g, '\\"')}") whose subrole is "AXCloseButton")
        end try
      end tell
    end tell
    `;
    try {
      await runAppleScript(closeScript);
      showToast({
        style: Toast.Style.Success,
        title: "Window closed",
      });
      revalidate();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not close window",
        message: String(err),
      });
    }
  }

  const apps = Array.from(new Set(instances.map((i) => i.appName))).sort();
  const filteredInstances =
    selectedApp === "all"
      ? instances
      : instances.filter((i) => i.appName === selectedApp);

  return (
    <List
      isLoading={isLoading && instances.length === 0}
      searchBarPlaceholder="Search instances or windows..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by App"
          value={selectedApp}
          onChange={(newVal) => setSelectedApp(newVal)}
        >
          <List.Dropdown.Item
            title="All Apps"
            value="all"
            icon={Icon.AppWindowList}
          />
          {apps.map((app) => (
            <List.Dropdown.Item key={app} title={app} value={app} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredInstances.map((item) => (
        <List.Item
          key={item.id}
          icon={item.appPath ? { fileIcon: item.appPath } : Icon.Window}
          title={item.windowTitle}
          subtitle={item.appName}
          accessories={
            item.isMinimized
              ? [
                  {
                    tag: { value: "Minimized", color: Color.SecondaryText },
                    icon: Icon.EyeDisabled,
                    tooltip: "Window is currently minimized",
                  },
                ]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title="Focus Window"
                icon={Icon.Eye}
                onAction={() => focusWindow(item)}
              />
              <Action
                title="Close Window"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                onAction={() => closeWindow(item)}
              />
              <Action
                title="Reload Windows"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
              <Action.CopyToClipboard
                title="Copy Window Title"
                content={item.windowTitle}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy App Name"
                content={item.appName}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
