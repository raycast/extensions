import { ActionPanel, Action, List, Icon, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface BraveTab {
  title: string;
  url: string;
  windowId: number;
  tabIndex: number; // 1-based index for AppleScript
}

export default function Command() {
  const [tabs, setTabs] = useState<BraveTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTabs();
  }, []);

  async function fetchTabs() {
    try {
      // JXA (JavaScript for Automation) is faster and cleaner for JSON output than vanilla AppleScript
      const script = `
        const browser = Application("Brave Browser");
        const windows = browser.windows();
        const output = [];
        
        // Iterate all windows
        for (let w = 0; w < windows.length; w++) {
          const win = windows[w];
          const winTabs = win.tabs();
          const winId = win.id();
          
          // Iterate all tabs in window
          for (let t = 0; t < winTabs.length; t++) {
            const tab = winTabs[t];
            output.push({
              title: tab.title(),
              url: tab.url(),
              windowId: winId,
              tabIndex: t + 1 // AppleScript uses 1-based indexing
            });
          }
        }
        JSON.stringify(output);
      `;

      // Execute JXA via osascript
      const { stdout } = await execAsync(`osascript -l JavaScript -e '${script}'`);
      const parsedTabs = JSON.parse(stdout);
      setTabs(parsedTabs);
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Could not fetch tabs",
        message: "Is Brave Browser running?",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function activateTab(windowId: number, tabIndex: number) {
    try {
      await closeMainWindow();
      // We use standard AppleScript here as it's often more reliable for "setting" focus than JXA
      const script = `
        tell application "Brave Browser"
          activate
          set index of window id ${windowId} to 1
          set active tab index of window id ${windowId} to ${tabIndex}
        end tell
      `;
      await execAsync(`osascript -e '${script}'`);
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch tab",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search open tabs...">
      {tabs.map((tab, index) => (
        <List.Item
          key={`${tab.windowId}-${tab.tabIndex}-${index}`}
          icon={Icon.AppWindow}
          title={tab.title || "Untitled Tab"}
          subtitle={tab.url}
          accessories={[{ text: new URL(tab.url).hostname.replace("www.", "") }]}
          actions={
            <ActionPanel>
              <Action
                title="Switch to Tab"
                icon={Icon.ArrowRight}
                onAction={() => activateTab(tab.windowId, tab.tabIndex)}
              />
              <Action.OpenInBrowser
                title="Open URL in New Tab"
                url={tab.url}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={tab.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchTabs}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
