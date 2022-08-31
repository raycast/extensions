import { runAppleScriptSync } from "run-applescript";
import { List, Action, ActionPanel, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";

function getOpenApps() {
  const apps = runAppleScriptSync(`
        tell application "System Events"
            set appList to the name of (every application process whose background only is false and name is not "Force Quit Application")
            return appList
        end tell
    `);

  return apps.split(", ");
}

function forceQuit(app: string) {
  exec(`killall '${app}'`);
}

const apps = getOpenApps();

export default function Command() {
  return (
    <List searchBarPlaceholder="Search open apps...">
      {apps.map((item) => (
        <List.Item
          key={item}
          title={item}
          actions={
            <ActionPanel title={item}>
              <Action
                title="Force Quit"
                onAction={() => {
                  closeMainWindow();
                  forceQuit(item);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
