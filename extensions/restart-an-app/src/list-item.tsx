import { Action, ActionPanel, List } from "@raycast/api";
import { AppEntry } from "./types";
import { restartApp } from "./utils";

export function ListItem({ app }: { app: AppEntry }) {
  function onRestart() {
    restartApp(app.name);
  }

  return (
    <List.Item
      title={app.name}
      subtitle={app.brand ?? ""}
      accessories={[{ text: app.location }]}
      icon={{ fileIcon: app.iconPath }}
      actions={
        <ActionPanel>
          <Action title="Restart App" onAction={onRestart} />
        </ActionPanel>
      }
    />
  );
}
