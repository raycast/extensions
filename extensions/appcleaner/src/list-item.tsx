import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { AppItem, launchUninstaller, showError } from "./lib";

export function ListItem({ app }: { app: AppItem }) {
  function uninstall() {
    const preferences = getPreferenceValues<Preferences>();

    launchUninstaller(preferences.uninstaller_app, app).catch((error: Error) => {
      showError(error.toString(), "Launching app failed");
    });
  }

  return (
    <List.Item
      title={app.name}
      subtitle={"by " + app.brand}
      accessories={[{ text: "in " + app.location }]}
      icon={{ source: app.icon }}
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
