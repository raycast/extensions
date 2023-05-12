import { useState, useEffect } from "react";
import { List, Icon, Action, ActionPanel, Detail } from "@raycast/api";
import { SelectTerminalApp } from "./SelectTermnialApp";
import { checkTerminalSetup } from "./utils/terminalUtils";
import { getAllWindow, switchToWindow, TmuxWindow } from "./utils/windowUtils";

export default function ManageTmuxWindows() {
  const [windows, setWindows] = useState<Array<TmuxWindow>>([]);
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
        const windows: TmuxWindow[] = lines.map((line) => {
          const [sessionName, windowName, windowIndex] = line.split(":");
          return {
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

  return (
    <>
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
              </ActionPanel>
            }
          />
        ))}
      </List>

      {!isTerminalSetup && !isLoading && (
        <Detail
          markdown="**Setup Default Terminal App Before Usage** `Go to Actions or using Cmd + k`"
          actions={
            <ActionPanel>
              <Action.Push title="Setup Here" target={<SelectTerminalApp setIsTerminalSetup={setIsTerminalSetup} />} />
            </ActionPanel>
          }
        />
      )}
    </>
  );
}
