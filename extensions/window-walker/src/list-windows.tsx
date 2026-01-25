import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { WindowInfo } from "./lib/types";
import {
  listWindows,
  switchToWindow,
  minimizeWindow,
  closeWindow,
  moveWindow,
  getAllScreens,
  minimizeAllExcept,
  ScreenInfo,
} from "./lib/windows";
import {
  getPermaPinnedWindows,
  getSessionPinnedWindows,
  getCachedPermaPinnedWindows,
  pinWindow,
  permaPinWindow,
  unpinWindow,
} from "./lib/storage";
import { LAYOUT_PRESETS } from "./lib/layouts";

interface WindowWithMeta extends WindowInfo {
  isPinned: boolean;
  isPermaPinned: boolean;
}

export default function Command() {
  const [windows, setWindows] = useState<WindowWithMeta[]>([]);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWindows = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      // Fetch all data in parallel - avoiding duplicate calls
      // Note: getPinnedWindows() internally calls getPermaPinnedWindows() AND getSessionPinnedWindows(),
      // so calling it AND getPermaPinnedWindows() separately causes redundant storage ops.
      // Instead, fetch the base data once and combine locally.
      const [windowList, sessionPinnedList, permaPinnedList, cachedPermaPinnedList, screenList] = await Promise.all([
        Promise.resolve(listWindows()),
        getSessionPinnedWindows(),
        getPermaPinnedWindows(),
        getCachedPermaPinnedWindows(),
        Promise.resolve(getAllScreens()),
      ]);

      // Combine perma pins + session pins (avoiding duplicates) - same logic as getPinnedWindows()
      const pinnedList = [...permaPinnedList];
      for (const sp of sessionPinnedList) {
        const exists = pinnedList.some((w) => w.processName === sp.processName && w.titlePattern === sp.titlePattern);
        if (!exists) {
          pinnedList.push(sp);
        }
      }

      // Filter and enhance windows
      const enhanced: WindowWithMeta[] = windowList
        .filter((w) => {
          // Filter out the main Raycast command window, but keep Settings etc.
          if (w.processName.toLowerCase() === "raycast" && w.title === "Raycast") {
            return false;
          }
          return true;
        })
        .map((w) => {
          const isPinned = pinnedList.some(
            (p) => p.processName === w.processName && (!p.titlePattern || w.title.includes(p.titlePattern)),
          );
          const isPermaPinned = permaPinnedList.some(
            (p) => p.processName === w.processName && (!p.titlePattern || w.title.includes(p.titlePattern)),
          );
          return { ...w, isPinned, isPermaPinned };
        });

      // Add cached perma-pinned windows that aren't currently open (dedupe by process name)
      const openProcessNames = new Set(windowList.map((w) => w.processName.toLowerCase()));
      const cachedWindows: WindowWithMeta[] = cachedPermaPinnedList
        .filter((cached) => !openProcessNames.has(cached.processName.toLowerCase()))
        .map((cached) => {
          const isPermaPinned = permaPinnedList.some(
            (p) => p.processName === cached.processName && (!p.titlePattern || cached.title.includes(p.titlePattern)),
          );
          return {
            handle: 0,
            title: cached.title,
            processName: cached.processName,
            processPath: cached.processPath,
            iconPath: cached.iconPath,
            isPinned: false,
            isPermaPinned,
          };
        });

      setWindows([...enhanced, ...cachedWindows]);
      setScreens(screenList);
    } catch (error) {
      if (!isSilent) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to list windows",
          message: String(error),
        });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWindows();

    // Auto-refresh every 1 second
    const interval = setInterval(() => {
      refreshWindows(true);
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshWindows]);

  const handleSwitch = async (window: WindowWithMeta) => {
    try {
      if (window.handle === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Window not available",
          message: "This window is currently closed. Please open it first.",
        });
        return;
      }
      switchToWindow(window.handle);
      await showHUD(`Switched to ${window.title}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch window",
        message: String(error),
      });
    }
  };

  const handleMinimize = async (window: WindowWithMeta) => {
    try {
      if (window.handle === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Window not available",
          message: "This window is currently closed. Please open it first.",
        });
        return;
      }
      minimizeWindow(window.handle);
      const toast = await showToast({
        style: Toast.Style.Success,
        title: `Minimized ${getAppDisplayName(window.processName)}`,
      });
      setTimeout(() => toast.hide(), 2000);
      refreshWindows();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to minimize window",
        message: String(error),
      });
    }
  };

  const handleClose = async (window: WindowWithMeta) => {
    try {
      if (window.handle === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Window not available",
          message: "This window is already closed.",
        });
        return;
      }
      closeWindow(window.handle);
      const toast = await showToast({
        style: Toast.Style.Success,
        title: `Closed ${getAppDisplayName(window.processName)}`,
      });
      setTimeout(() => toast.hide(), 2000);
      setTimeout(() => refreshWindows(), 300);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to close window",
        message: String(error),
      });
    }
  };

  const handlePin = async (window: WindowWithMeta) => {
    try {
      if (window.isPinned) {
        await unpinWindow(window.processName);
        const toast = await showToast({
          style: Toast.Style.Success,
          title: `Unpinned ${getAppDisplayName(window.processName)}`,
        });
        setTimeout(() => toast.hide(), 2000);
      } else {
        await pinWindow(window.processName);
        const toast = await showToast({
          style: Toast.Style.Success,
          title: `Pinned ${getAppDisplayName(window.processName)}`,
        });
        setTimeout(() => toast.hide(), 2000);
      }
      refreshWindows();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update pin",
        message: String(error),
      });
    }
  };

  const handlePermaPin = async (window: WindowWithMeta) => {
    try {
      if (window.isPermaPinned) {
        await unpinWindow(window.processName);
        const toast = await showToast({
          style: Toast.Style.Success,
          title: `Removed permanent pin`,
        });
        setTimeout(() => toast.hide(), 2000);
      } else {
        await permaPinWindow(window.processName, undefined, {
          processName: window.processName,
          title: window.title,
          processPath: window.processPath,
          iconPath: window.iconPath,
          cachedAt: Date.now(),
        });
        const toast = await showToast({
          style: Toast.Style.Success,
          title: `Permanently pinned ${getAppDisplayName(window.processName)}`,
        });
        setTimeout(() => toast.hide(), 2000);
      }
      refreshWindows();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update perma-pin",
        message: String(error),
      });
    }
  };

  const handleLayout = async (window: WindowWithMeta, layoutIndex: number, screen: ScreenInfo) => {
    try {
      if (window.handle === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Window not available",
          message: "This window is currently closed. Please open it first.",
        });
        return;
      }
      const layout = LAYOUT_PRESETS[layoutIndex];
      const pos = layout.apply(screen.width, screen.height, screen.x, screen.y);
      moveWindow(window.handle, pos.x, pos.y, pos.width, pos.height);
      const toast = await showToast({
        style: Toast.Style.Success,
        title: `Applied ${layout.name} to ${screen.name}`,
      });
      setTimeout(() => toast.hide(), 2000);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply layout",
        message: String(error),
      });
    }
  };

  const handleFocusMode = async (window: WindowWithMeta) => {
    try {
      if (window.handle === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Window not available",
          message: "This window is currently closed. Please open it first.",
        });
        return;
      }
      minimizeAllExcept(window.handle);
      switchToWindow(window.handle);
      await showHUD(`Focus mode: ${getAppDisplayName(window.processName)}`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to activate focus mode",
        message: String(error),
      });
    }
  };

  // Map process names to friendly display names
  const getAppDisplayName = (processName: string): string => {
    if (!processName) return "Unknown";
    const nameMap: Record<string, string> = {
      chrome: "Google Chrome",
      firefox: "Firefox",
      msedge: "Microsoft Edge",
      code: "Visual Studio Code",
      explorer: "File Explorer",
      notepad: "Notepad",
      cmd: "Command Prompt",
      powershell: "PowerShell",
      windowsterminal: "Windows Terminal",
      slack: "Slack",
      discord: "Discord",
      spotify: "Spotify",
      teams: "Microsoft Teams",
      outlook: "Outlook",
      winword: "Microsoft Word",
      excel: "Microsoft Excel",
      powerpnt: "PowerPoint",
      onenote: "OneNote",
      "notepad++": "Notepad++",
      obs64: "OBS Studio",
      vlc: "VLC",
      steam: "Steam",
      steamwebhelper: "Steam",
      comet: "Comet",
      raycast: "Raycast",
      antigravity: "Antigravity",
      nvcleanstall: "NVCleanstall",
    };
    const lower = processName.toLowerCase();
    return nameMap[lower] || processName.charAt(0).toUpperCase() + processName.slice(1);
  };

  // Get app icon - use extracted icon if available, otherwise fallback to generic
  const getAppIcon = (window: WindowWithMeta): Icon | { source: string } => {
    // Use extracted icon if available
    if (window.iconPath) {
      return { source: window.iconPath };
    }

    // Fallback to generic icons
    const lower = window.processName.toLowerCase();
    const iconMap: Record<string, Icon> = {
      chrome: Icon.Globe,
      firefox: Icon.Globe,
      msedge: Icon.Globe,
      code: Icon.Code,
      explorer: Icon.Folder,
      notepad: Icon.Document,
      cmd: Icon.Terminal,
      powershell: Icon.Terminal,
      windowsterminal: Icon.Terminal,
      slack: Icon.Message,
      discord: Icon.Message,
      spotify: Icon.Music,
      teams: Icon.TwoPeople,
      outlook: Icon.Envelope,
      steam: Icon.GameController,
      steamwebhelper: Icon.GameController,
      obs64: Icon.Video,
      vlc: Icon.Video,
    };
    return iconMap[lower] || Icon.AppWindow;
  };

  // Get accessories for a window
  const getAccessories = (window: WindowWithMeta): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];
    if (window.handle === 0) {
      accessories.push({ text: "Closed", tooltip: "Window is currently closed" });
    }
    if (window.isPermaPinned) {
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Orange }, tooltip: "Permanently Pinned" });
    } else if (window.isPinned) {
      accessories.push({ icon: { source: Icon.Pin, tintColor: Color.Yellow }, tooltip: "Pinned (session)" });
    }
    return accessories;
  };

  // Group windows
  const pinnedWindows = windows.filter((w) => w.isPinned);
  const otherWindows = windows.filter((w) => !w.isPinned);

  // Group other windows by app
  const groupedByApp = otherWindows.reduce(
    (acc, w) => {
      const key = w.processName.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(w);
      return acc;
    },
    {} as Record<string, WindowWithMeta[]>,
  );

  // Render standard window item (shows app name + window title)
  const renderWindowItem = (window: WindowWithMeta) => (
    <List.Item
      key={window.handle}
      icon={getAppIcon(window)}
      title={getAppDisplayName(window.processName)}
      subtitle={window.title}
      keywords={[window.processName, window.title, getAppDisplayName(window.processName)]}
      accessories={getAccessories(window)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Switch to Window" icon={Icon.ArrowRight} onAction={() => handleSwitch(window)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Pin Actions">
            <Action
              title={window.isPinned ? "Unpin Window" : "Pin Window"}
              icon={window.isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
              onAction={() => handlePin(window)}
            />
            <Action
              title={window.isPermaPinned ? "Remove Permanent Pin" : "Permanently Pin"}
              icon={window.isPermaPinned ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
              onAction={() => handlePermaPin(window)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Window Actions">
            <Action
              title="Focus Mode"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
              onAction={() => handleFocusMode(window)}
            />
            <Action
              title="Minimize Window"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
              onAction={() => handleMinimize(window)}
            />
            <Action
              title="Close Window"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
              onAction={() => handleClose(window)}
            />
          </ActionPanel.Section>
          {screens.length > 1 ? (
            screens.map((screen) => (
              <ActionPanel.Submenu
                key={screen.name}
                title={`Move to ${screen.name}`}
                icon={screen.isPrimary ? Icon.Desktop : Icon.Monitor}
              >
                {LAYOUT_PRESETS.map((layout, index) => (
                  <Action
                    key={layout.name}
                    title={`${layout.icon} ${layout.name}`}
                    onAction={() => handleLayout(window, index, screen)}
                  />
                ))}
              </ActionPanel.Submenu>
            ))
          ) : (
            <ActionPanel.Submenu
              title="Move to Layout"
              icon={Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}
            >
              {LAYOUT_PRESETS.map((layout, index) => (
                <Action
                  key={layout.name}
                  title={`${layout.icon} ${layout.name}`}
                  onAction={() => handleLayout(window, index, screens[0])}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Section>
            <Action
              title="Refresh Window List"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
              onAction={refreshWindows}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  // Render for grouped items - show only window title since app name is in section header
  const renderGroupedItem = (window: WindowWithMeta) => (
    <List.Item
      key={window.handle}
      icon={getAppIcon(window)}
      title={window.title}
      keywords={[window.processName, window.title, getAppDisplayName(window.processName)]}
      accessories={getAccessories(window)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Switch to Window" icon={Icon.ArrowRight} onAction={() => handleSwitch(window)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Pin Actions">
            <Action
              title={window.isPinned ? "Unpin Window" : "Pin Window"}
              icon={window.isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
              onAction={() => handlePin(window)}
            />
            <Action
              title={window.isPermaPinned ? "Remove Permanent Pin" : "Permanently Pin"}
              icon={window.isPermaPinned ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
              onAction={() => handlePermaPin(window)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Window Actions">
            <Action
              title="Focus Mode"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "f" }}
              onAction={() => handleFocusMode(window)}
            />
            <Action
              title="Minimize Window"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
              onAction={() => handleMinimize(window)}
            />
            <Action
              title="Close Window"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "w" }}
              onAction={() => handleClose(window)}
            />
          </ActionPanel.Section>
          {screens.length > 1 ? (
            screens.map((screen) => (
              <ActionPanel.Submenu
                key={screen.name}
                title={`Move to ${screen.name}`}
                icon={screen.isPrimary ? Icon.Desktop : Icon.Monitor}
              >
                {LAYOUT_PRESETS.map((layout, index) => (
                  <Action
                    key={layout.name}
                    title={`${layout.icon} ${layout.name}`}
                    onAction={() => handleLayout(window, index, screen)}
                  />
                ))}
              </ActionPanel.Submenu>
            ))
          ) : (
            <ActionPanel.Submenu
              title="Move to Layout"
              icon={Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}
            >
              {LAYOUT_PRESETS.map((layout, index) => (
                <Action
                  key={layout.name}
                  title={`${layout.icon} ${layout.name}`}
                  onAction={() => handleLayout(window, index, screens[0])}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Section>
            <Action
              title="Refresh Window List"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
              onAction={refreshWindows}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search windows by app or title...">
      {windows.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No Windows Found"
          description="No visible application windows are currently open."
        />
      ) : (
        <>
          {/* Pinned section */}
          {pinnedWindows.length > 0 && (
            <List.Section
              title="📌 Pinned"
              subtitle={pinnedWindows.length > 1 ? `${pinnedWindows.length} windows` : undefined}
            >
              {pinnedWindows.map(renderWindowItem)}
            </List.Section>
          )}
          {/* Multi-window app groups first */}
          {Object.entries(groupedByApp)
            .filter(([, appWindows]) => appWindows.length > 1)
            .map(([processName, appWindows]) => (
              <List.Section
                key={processName}
                title={getAppDisplayName(processName)}
                subtitle={`${appWindows.length} windows`}
              >
                {appWindows.map(renderGroupedItem)}
              </List.Section>
            ))}
          {/* Single-window apps grouped together */}
          {(() => {
            const singleWindows = Object.entries(groupedByApp)
              .filter(([, appWindows]) => appWindows.length === 1)
              .map(([, appWindows]) => appWindows[0]);
            if (singleWindows.length === 0) return null;
            return <List.Section title="Windows">{singleWindows.map(renderWindowItem)}</List.Section>;
          })()}
        </>
      )}
    </List>
  );
}
