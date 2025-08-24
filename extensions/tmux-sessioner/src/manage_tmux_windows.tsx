import { Action, ActionPanel, Color, Icon, launchCommand, LaunchType, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { deleteWindow, getAllWindow, switchToWindow, type TmuxWindow } from "./utils/windowUtils";
import { RenameTmux } from "./RenameTmux";

export default function ManageTmuxWindows() {
  const [windows, setWindows] = useState<Array<TmuxWindow & { keyIndex: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

  const { push } = useNavigation();

  // Init list of windows
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
            windowIndex: Number.parseInt(windowIndex),
            windowName,
          };
        });

        setWindows(windows);
      }

      setIsLoading(false);
    });
  };

  // Terminal Setup Check
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
          icon={Icon.Gear}
          keywords={[window.sessionName, window.windowName]}
          title={{
            value: window.windowName,
            tooltip: `Session: ${window.sessionName} / Window No: ${window.windowIndex}`,
          }}
          accessories={[
            {
              text: { value: window.sessionName, color: Color.Green },
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Switch to Selected Window" onAction={() => switchToWindow(window, setIsLoading)} />
              <Action
                title="Rename this Window"
                onAction={() => {
                  push(
                    <RenameTmux
                      sessionName={window.sessionName}
                      windowName={window.windowName}
                      type="Window"
                      callback={() => setupListWindows()}
                    />,
                  );
                }}
                shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
              />
              <Action
                title="Delete This Window"
                onAction={() =>
                  deleteWindow(window, setIsLoading, () =>
                    setWindows(windows.filter((w) => w.keyIndex !== window.keyIndex)),
                  )
                }
                shortcut={{ modifiers: ["cmd", "opt"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
