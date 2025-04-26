import { Action, ActionPanel, List } from "@raycast/api";
import { AppItem, Uninstaller, showError } from "./lib";

export function ListItem({ app }: { app: AppItem }) {
  function uninstall() {
    Uninstaller.launch(app).catch((error: Error) => {
      showError(error.toString());
    });
  }

  return (
    <List.Item
      title={app.name}
      subtitle={"by " + app.brand}
      accessories={[{ text: "in " + app.location }]}
      icon={{ fileIcon: app.path }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Uninstall" onAction={uninstall} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
