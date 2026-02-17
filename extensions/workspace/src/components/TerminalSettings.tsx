import { Action, ActionPanel, Icon, List, useNavigation, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getApplications, type Application } from "@raycast/api";

import { saveStoredTerminalApp } from "../utils/storage";

export default function TerminalSettings() {
  const { pop } = useNavigation();
  const { isLoading, data: apps } = usePromise(getApplications);

  const setTerminal = async (app: Application) => {
    await saveStoredTerminalApp({ name: app.name, bundleId: app.bundleId || "" });
    await showToast({
      style: Toast.Style.Success,
      title: "App Updated",
      message: app.name,
    });
    pop();
  };

  const resetTerminal = async () => {
    await saveStoredTerminalApp(null);
    await showToast({
      style: Toast.Style.Success,
      title: "App Updated",
      message: "Default",
    });
    pop();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for an app..." navigationTitle="Terminal">
      <List.Item
        title="Default"
        subtitle="Use the default terminal from settings"
        icon={Icon.ArrowCounterClockwise}
        actions={
          <ActionPanel>
            <Action title="Reset to Default" onAction={resetTerminal} />
          </ActionPanel>
        }
      />
      {apps?.map((app) => (
        <List.Item
          key={app.bundleId || app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title="Select App" icon={Icon.Check} onAction={() => setTerminal(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
