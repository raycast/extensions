import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, launchCommand, LaunchType } from "@raycast/api";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { getAllWindow, switchToWindow, TmuxWindow, deleteWindow } from "./utils/windowUtils";

export default function ManageTmuxWindows() {
  const [windows, setWindows] = useState<Array<TmuxWindow & { keyIndex: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

  const setupListWindows = () => {
    getAllWindow((error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setIsLoading(false);
        return;
      }

      const lines = stdout.trim().split("\n");

      if (lines?.length > 0) {
        let keyIndex = 0;
        const windows = lines.map((line) => {
          const [sessionName, windowName, windowIndex] = line.split(":");
          keyIndex += 1; // NOTE: using key index for easily delete and remove window outside the original list
          return {
            keyIndex,
            sessionName,
            windowIndex: parseInt(windowIndex),
            windowName,
          };
        });

        setWindows(windows);
      }

      setIsLoading(false);
    });
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);

      const isSetup = await checkTerminalSetup(setIsTerminalSetup);

      if (!isSetup) {
        setIsLoading(false);
        return;
      }
    })();
  }, []);

  useEffect(() => {
    if (!isTerminalSetup) {
      return;
    }

    // List down all tmux session
    setIsLoading(true);
    setupListWindows();
  }, [isTerminalSetup]);

  useEffect(() => {
    if (isLoading || isTerminalSetup) {
      return;
    }
    launchCommand({
      type: LaunchType.UserInitiated,
      name: "choose_terminal_app",
      extensionName: "tmux-sessioner",
      ownerOrAuthorName: "louishuyng",
      context: { launcherCommand: "manage_tmux_windows" },
    });
  }, [isTerminalSetup, isLoading]);

  return (
    <List isLoading={isLoading}>
      {windows.map((window, index) => (
        <List.Item
          key={index}
          icon={Icon.Window}
          title={window.windowName}
          subtitle={window.sessionName}
          actions={
            <ActionPanel>
              <Action title="Switch To Selected Window" onAction={() => switchToWindow(window, setIsLoading)} />
              <Action
                title="Delete This Window"
                onAction={() =>
                  deleteWindow(window, setIsLoading, () =>
                    setWindows(windows.filter((w) => w.keyIndex !== window.keyIndex))
                  )
                }
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
