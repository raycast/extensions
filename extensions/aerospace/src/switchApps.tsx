import { Action, ActionPanel, List } from "@raycast/api";
import { focusWindow, getWindows } from "./utils/appSwitcher";

export default function Command() {
  const windows = getWindows();
  console.log("command", windows);

  return (
    <List navigationTitle={`Windows in Workspace ${windows[0].workspace}`}>
      {windows?.map((window) => {
        return (
          <List.Item
            key={window.windowId}
            title={window.appName}
            subtitle={window.windowTitle}
            icon={{ fileIcon: window.appPath }}
            actions={
              <ActionPanel>
                <Action
                  title="Focus Window"
                  onAction={() => {
                    focusWindow(window.windowId);
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
