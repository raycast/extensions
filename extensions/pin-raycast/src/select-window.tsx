import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  listWindows,
  pinWindowById,
  isAgentRunning,
  WindowInfo,
} from "./utils/agent-ipc";

export default function Command() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [agentRunning, setAgentRunning] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchWindows() {
    setLoading(true);
    const running = await isAgentRunning();
    setAgentRunning(running);

    if (running) {
      const windowList = await listWindows();
      setWindows(windowList);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWindows();
  }, []);

  if (loading) {
    return (
      <List
        isLoading={true}
        searchBarPlaceholder="Search windows by app name..."
      />
    );
  }

  if (!agentRunning) {
    return (
      <List searchBarPlaceholder="Search windows by app name...">
        <List.Item
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Agent Not Running"
          subtitle="Use 'Launch Agent' command to start"
        />
      </List>
    );
  }

  if (windows.length === 0) {
    return (
      <List searchBarPlaceholder="Search windows by app name...">
        <List.Item
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="No Windows Found"
          subtitle="No valid windows available to pin"
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search windows by app name...">
      {windows.map((window) => (
        <List.Item
          key={window.windowID}
          icon={{ source: Icon.AppWindow, tintColor: Color.Blue }}
          title={window.appName}
          subtitle={window.windowTitle || ""}
          accessories={[
            {
              text: `${Math.round(window.bounds.width)}x${Math.round(window.bounds.height)}`,
              tooltip: "Window size",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Pin This Window"
                icon={Icon.Pin}
                onAction={async () => {
                  await pinWindowById(window.windowID);
                  await popToRoot();
                }}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={fetchWindows}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
