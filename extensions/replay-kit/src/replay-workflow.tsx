import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getRecordingsByUser, getCurrentUser } from "./utils/storage";
import { TaskRecording, TaskAction } from "./types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function ReplayTask() {
  const [recordings, setRecordings] = useState<TaskRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    try {
      const user = await getCurrentUser();
      const userRecordings = await getRecordingsByUser(user);
      setRecordings(userRecordings.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recordings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReplayTask(recording: TaskRecording) {
    setIsReplaying(true);
    console.log(isReplaying);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Starting replay...",
        message: `Replaying ${recording.actions.length} actions`,
      });

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < recording.actions.length; i++) {
        const action = recording.actions[i];

        try {
          await replayAction(action);
          successCount++;

          showToast({
            style: Toast.Style.Animated,
            title: `Replaying... (${i + 1}/${recording.actions.length})`,
            message: `${successCount} successful, ${failureCount} failed`,
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          failureCount++;
          console.error(`Failed to replay action ${action.id}:`, error);
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "Replay completed",
        message: `${successCount} successful, ${failureCount} failed`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Replay failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsReplaying(false);
    }
  }

  async function replayAction(action: TaskAction): Promise<void> {
    switch (action.type) {
      case "browser":
        await replayBrowserAction(action);
        break;
      case "terminal":
        await replayTerminalAction(action);
        break;
      case "application":
        await replayApplicationAction(action);
        break;
      case "file":
        await replayFileAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async function replayBrowserAction(action: TaskAction): Promise<void> {
    const browserData = action.data as any;

    if (browserData.action === "navigate" && browserData.url) {
      // Use the same browser that was recorded
      const browser = browserData.browser || "default";
      const tabContext = browserData.tabContext || "new_tab";

      try {
        if (browser === "Safari") {
          await ensureBrowserIsOpen("Safari");
          if (tabContext === "new_tab") {
            await execAsync(
              `osascript -e 'tell application "Safari" to tell front window to set current tab to (make new tab with properties {URL:"${browserData.url}"})'`
            );
          } else {
            await execAsync(
              `osascript -e 'tell application "Safari" to set URL of current tab of front window to "${browserData.url}"'`
            );
          }
        } else if (browser === "Google Chrome") {
          await ensureBrowserIsOpen("Google Chrome");
          if (tabContext === "new_tab") {
            await execAsync(
              `osascript -e 'tell application "Google Chrome" to tell front window to make new tab with properties {URL:"${browserData.url}"}'`
            );
          } else {
            await execAsync(
              `osascript -e 'tell application "Google Chrome" to set URL of active tab of front window to "${browserData.url}"'`
            );
          }
        } else if (browser === "Arc") {
          await ensureBrowserIsOpen("Arc");
          if (tabContext === "new_tab") {
            await execAsync(
              `osascript -e 'tell application "Arc" to tell front window to make new tab with properties {URL:"${browserData.url}"}'`
            );
          } else {
            await execAsync(
              `osascript -e 'tell application "Arc" to set URL of active tab of front window to "${browserData.url}"'`
            );
          }
        } else {
          // Fallback to system default browser
          await execAsync(`open "${browserData.url}"`);
        }
      } catch (error) {
        // Fallback to system default if specific browser fails
        console.error(`Failed to open in ${browser}, using default:`, error);
        await execAsync(`open "${browserData.url}"`);
      }
    }
  }

  async function ensureBrowserIsOpen(browser: string): Promise<void> {
    try {
      // Check if browser is running
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events" to get name of every application process whose name contains "${browser}"'`
      );

      if (!stdout.trim()) {
        // Browser is not running, launch it
        console.log(`Launching ${browser}...`);
        await execAsync(`open -a "${browser}"`);

        // Wait for browser to launch
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Ensure there's at least one window open
        if (browser === "Safari") {
          await execAsync(
            `osascript -e 'tell application "Safari" to if (count of windows) = 0 then make new document'`
          );
        } else if (browser === "Google Chrome") {
          await execAsync(
            `osascript -e 'tell application "Google Chrome" to if (count of windows) = 0 then make new window'`
          );
        } else if (browser === "Arc") {
          await execAsync(
            `osascript -e 'tell application "Arc" to if (count of windows) = 0 then make new window'`
          );
        }

        // Additional wait for window creation
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Browser is running, ensure it has a window
        try {
          if (browser === "Safari") {
            await execAsync(
              `osascript -e 'tell application "Safari" to if (count of windows) = 0 then make new document'`
            );
          } else if (browser === "Google Chrome") {
            await execAsync(
              `osascript -e 'tell application "Google Chrome" to if (count of windows) = 0 then make new window'`
            );
          } else if (browser === "Arc") {
            await execAsync(
              `osascript -e 'tell application "Arc" to if (count of windows) = 0 then make new window'`
            );
          }
        } catch (windowError) {
          console.error(`Error ensuring ${browser} window:`, windowError);
        }
      }
    } catch (error) {
      console.error(`Error checking/launching ${browser}:`, error);
      throw error;
    }
  }

  async function replayTerminalAction(action: TaskAction): Promise<void> {
    const terminalData = action.data as any;

    if (terminalData.command) {
      const script = `
        tell application "Terminal"
          if not (exists window 1) then
            do shell script "open -a Terminal"
            delay 1
          end if
          activate
          do script "${terminalData.command.replace(
            /"/g,
            '\\"'
          )}" in front window
        end tell
      `;

      await execAsync(`osascript -e '${script}'`);
    }
  }

  async function replayApplicationAction(action: TaskAction): Promise<void> {
    const appData = action.data as any;

    if (appData.action === "open" && appData.app) {
      await execAsync(`open -a "${appData.app}"`);
    }
  }

  async function replayFileAction(action: TaskAction): Promise<void> {
    const fileData = action.data as any;

    if (fileData.action === "open" && fileData.path) {
      await execAsync(`open "${fileData.path}"`);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Select a Recording to Replay">
        {recordings.length === 0 ? (
          <List.Item
            title="No recordings found"
            subtitle="Create some task recordings first"
            icon={Icon.Document}
          />
        ) : (
          recordings.map((recording) => (
            <List.Item
              key={recording.id}
              title={recording.name}
              subtitle={recording.description || "No description"}
              accessories={[
                { text: formatDate(recording.createdAt) },
                { text: `${recording.actions.length} actions` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Replay This Task"
                    onAction={() => handleReplayTask(recording)}
                    icon={Icon.Play}
                  />
                  <Action.Push
                    title="View Details"
                    target={<RecordingPreview recording={recording} />}
                    icon={Icon.Eye}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

function RecordingPreview({ recording }: { recording: TaskRecording }) {
  return (
    <List>
      <List.Section title={`Preview: ${recording.name}`}>
        <List.Item
          title="Description"
          subtitle={recording.description || "No description"}
        />
        <List.Item
          title="Actions Count"
          subtitle={`${recording.actions.length} actions will be replayed`}
        />
        <List.Item
          title="Created"
          subtitle={new Date(recording.createdAt).toLocaleString()}
        />
      </List.Section>
      <List.Section title="Actions Preview">
        {recording.actions.slice(0, 10).map((action, index) => (
          <List.Item
            key={action.id}
            title={`${index + 1}. ${action.type.toUpperCase()}`}
            subtitle={getActionDescription(action)}
          />
        ))}
        {recording.actions.length > 10 && (
          <List.Item
            title="..."
            subtitle={`And ${recording.actions.length - 10} more actions`}
          />
        )}
      </List.Section>
    </List>
  );
}

function getActionDescription(action: TaskAction): string {
  const data = action.data as any;

  switch (action.type) {
    case "browser":
      const tabContextText =
        data.tabContext === "same_tab"
          ? "(same tab)"
          : data.tabContext === "new_tab"
          ? "(new tab)"
          : data.tabContext === "new_window"
          ? "(new window)"
          : "";
      const browserText = data.browser ? ` in ${data.browser}` : "";
      return `${data.action}: ${data.url}${browserText} ${tabContextText}`.trim();
    case "terminal":
      return `Command: ${data.command}`;
    case "application":
      return `${data.action}: ${data.app}`;
    case "file":
      return `${data.action}: ${data.path}`;
    default:
      return "Unknown action";
  }
}
