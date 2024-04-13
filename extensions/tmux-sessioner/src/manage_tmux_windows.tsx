import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, launchCommand, LaunchType, Color } from "@raycast/api";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { getAllWindow, switchToWindow, TmuxWindow, deleteWindow } from "./utils/windowUtils";

export default function ManageTmuxWindows() {
  const [windows, setWindows] = useState<Array<TmuxWindow & { keyIndex: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTerminalSetup, setIsTerminalSetup] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [filteredWindows, setFilteredWindows] = useState<Array<TmuxWindow & { keyIndex: number }>>([]);

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
            windowIndex: parseInt(windowIndex),
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

  // Search Text Customization
  useEffect(() => {
    if (searchText.length === 0) {
      setFilteredWindows(windows);
    }

    const filteredWindows = windows.filter(
      (window) =>
        window.windowName.toLowerCase().includes(searchText.toLowerCase()) ||
        window.sessionName.toLowerCase().includes(searchText.toLowerCase())
    );

    setFilteredWindows(filteredWindows);
  }, [searchText, windows]);

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {filteredWindows.map((window, index) => (
        <List.Item
          key={index}
          icon={Icon.Gear}
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
