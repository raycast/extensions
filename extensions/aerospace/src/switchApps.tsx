import { Action, ActionPanel, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { Windows, focusWindow, getWindows } from "./utils/appSwitcher";
import { useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";

interface Preferences {
  config: string;
  defaultWorkspace: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SwitchApps }>) {
  const { defaultWorkspace } = getPreferenceValues<Preferences>();
  const [windows, setWindows] = useCachedState<Windows>("windows", []);

  const workspace = props.arguments.workspace ? props.arguments.workspace : defaultWorkspace;

  useEffect(() => {
    const f = async () => {
      const updatedWindows = await getWindows(workspace);
      setWindows(updatedWindows);
      console.log({ updatedWindows });
    };
    f();
  }, []);

  const groupedByWorkspace = useMemo(() => {
    const groups: Record<string, { monitor: string; windows: typeof windows }> = {};
    for (const window of windows) {
      const key = window.workspace;
      if (!groups[key]) {
        groups[key] = { monitor: window["monitor-name"], windows: [] };
      }
      groups[key].windows.push(window);
    }
    return groups;
  }, [windows]);

  const navigationTitle =
    workspace === "focused" ? `Windows in Workspace ${windows[0]?.workspace || ""}` : "Windows in All Workspaces";

  return (
    <List isLoading={windows.length === 0} navigationTitle={navigationTitle}>
      {Object.entries(groupedByWorkspace).map(([workspaceName, group]) => (
        <List.Section key={workspaceName} title={`Workspace ${workspaceName} - ${group.monitor}`}>
          {group.windows.map((window) => (
            <List.Item
              key={window["window-id"]}
              title={window["app-name"]}
              subtitle={window["window-title"]}
              icon={{ fileIcon: window["app-path"] }}
              actions={
                <ActionPanel>
                  <Action
                    title="Focus Window"
                    onAction={() => {
                      focusWindow(window["window-id"].toString());
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
