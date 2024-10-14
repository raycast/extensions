import { Action, ActionPanel, List } from "@raycast/api";
import { Windows, focusWindow, getWindows } from "./utils/appSwitcher";
import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [windows, setWindows] = useCachedState<Windows>("windows", []);

  useEffect(() => {
    const updatedWindows = getWindows();
    setWindows(updatedWindows);
    console.log({ updatedWindows });
  }, []);

  return (
    <List isLoading={windows.length === 0} navigationTitle={`Windows in Workspace ${windows[0]?.workspace || ""}`}>
      {windows.map((window) => {
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
    </List>
  );
}
