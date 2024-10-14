import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, closeMainWindow } from "@raycast/api";

interface SafariWindow {
  windowIndex: number;
  windowId: number;
  frontTabName: string;
}

export default function Command() {
  const [windows, setWindows] = useState<SafariWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWindows() {
      try {
        const script = `
          set output to ""
          tell application "Safari"
              repeat with w in windows
                  set window_index to index of w
                  set window_id to id of w
                  set front_tab_name to name of front tab of w
                  set output to output & window_index & "::" & window_id & "::" & front_tab_name & linefeed
              end repeat
          end tell
          return output
        `;
        const result = await runAppleScript(script);
        const windows = result
          .trim()
          .split("\n")
          .map((line) => {
            const [window_index, window_id, front_tab_name] = line.split("::");
            return {
              windowIndex: parseInt(window_index),
              windowId: parseInt(window_id),
              frontTabName: front_tab_name,
            };
          });
        setWindows(windows);
      } catch (error) {
        console.error("Error fetching Safari windows:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWindows();
  }, []);

  return (
    <List isLoading={loading}>
      {windows.map((window) => (
        <List.Item
          key={window.windowId}
          icon={Icon.Window}
          title={`Window ${window.windowIndex}`}
          subtitle={window.frontTabName}
          actions={
            <ActionPanel>
              <Action
                title="Focus Window"
                onAction={async () => {
                  console.log("Attempting to focus window with ID:", window.windowId);
                  try {
                    const script = `
                      tell application "Safari"
                          activate
                          set the index of window id ${window.windowId} to 1
                      end tell
                    `;
                    await runAppleScript(script);
                    // Close the Raycast window after the action is completed
                    await closeMainWindow();
                  } catch (error) {
                    console.error("Error focusing Safari window:", error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
