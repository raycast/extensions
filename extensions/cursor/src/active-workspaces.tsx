import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";

interface CursorWindow {
  title: string;
  fileName: string;
  workspaceName: string;
}

function stripAppSuffix(title: string): string {
  return title.replace(/ — Cursor$/, "");
}

function parseWindowTitle(rawTitle: string): CursorWindow {
  const displayTitle = stripAppSuffix(rawTitle);
  const parts = displayTitle.split(" — ");
  if (parts.length >= 2) {
    return {
      title: rawTitle,
      fileName: parts[0].trim(),
      workspaceName: parts.slice(1).join(" — ").trim(),
    };
  }
  return {
    title: rawTitle,
    fileName: "",
    workspaceName: displayTitle.trim(),
  };
}

function buildFocusScript(windowTitle: string): string {
  const escaped = windowTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `
    tell application "Cursor" to activate
    tell application "System Events"
      tell process "Cursor"
        set frontmost to true
        perform action "AXRaise" of (first window whose name is "${escaped}")
      end tell
    end tell
  `;
}

function getActiveWindowsScript(): string {
  return `
    tell application "System Events"
      if exists process "Cursor" then
        tell process "Cursor"
          set windowNames to name of every window
          set output to ""
          repeat with wName in windowNames
            set output to output & wName & linefeed
          end repeat
          return output
        end tell
      else
        return ""
      end if
    end tell
  `;
}

function useActiveWindows() {
  const [windows, setWindows] = useState<CursorWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWindows = async () => {
    setIsLoading(true);
    try {
      const result = await runAppleScript(getActiveWindowsScript());
      const titles = result
        .split("\n")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
      setWindows(titles.map(parseWindowTitle));
    } catch (error) {
      await showToast({
        title: "Failed to get active workspaces",
        style: Toast.Style.Failure,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  return { windows, isLoading, refresh: fetchWindows };
}

export default function ActiveWorkspaces() {
  const { windows, isLoading, refresh } = useActiveWindows();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search active workspaces...">
      <List.EmptyView title="No Active Workspaces" description="Open a Cursor window to see it listed here." />
      {windows.map((window, index) => (
        <List.Item
          key={`${window.title}-${index}`}
          title={window.fileName || window.workspaceName}
          subtitle={window.fileName ? window.workspaceName : undefined}
          icon="cursor-icon.png"
          actions={
            <ActionPanel>
              <Action
                title="Focus Window"
                icon={Icon.Window}
                onAction={async () => {
                  try {
                    await closeMainWindow();
                    await runAppleScript(buildFocusScript(window.title));
                  } catch (error) {
                    await showToast({
                      title: "Failed to focus window",
                      style: Toast.Style.Failure,
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
