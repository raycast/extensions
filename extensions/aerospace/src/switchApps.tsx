import { Action, ActionPanel, List } from "@raycast/api";
import { focusWindow, getWindows } from "./utils/appSwitcher";

export default function Command() {
  const windows = getWindows();
  console.log(windows);

  return (
    <List navigationTitle={`Windows in Workspace ${windows[0].workspace}`}>
      {windows?.map((window) => {
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
