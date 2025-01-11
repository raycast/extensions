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

  const uniqueWorkspaces = useMemo(() => {
    const workspaces = windows.map((window) => window.workspace);
    return [...new Set(workspaces)];
  }, [windows]);

  const navigationTitle =
    workspace === "focused" ? `Windows in Workspace ${windows[0]?.workspace || ""}` : "Windows in All Workspaces";

  return (
    <List isLoading={windows.length === 0} navigationTitle={navigationTitle}>
      {uniqueWorkspaces.map((uniqueWorkspace) => {
        return (
          <List.Section key={uniqueWorkspace} title={`Workspace ${uniqueWorkspace}`}>
            {windows
              .filter((window) => window.workspace === uniqueWorkspace)
              .map((window) => {
                return (
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
                );
              })}
          </List.Section>
        );
      })}
    </List>
  );
}
