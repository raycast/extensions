import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { type Application, getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { saveStoredTerminalApp } from "@/utils/storage";

export default function TerminalSettings() {
  const { pop } = useNavigation();
  const { data: apps, isLoading } = usePromise(getApplications);

  const setTerminal = async (app: Application) => {
    await saveStoredTerminalApp({ bundleId: app.bundleId || "", name: app.name });
    await showToast({
      message: app.name,
      style: Toast.Style.Success,
      title: "App Updated",
    });

    pop();
  };

  const resetTerminal = async () => {
    await saveStoredTerminalApp(null);
    await showToast({
      message: "Default",
      style: Toast.Style.Success,
      title: "App Updated",
    });

    pop();
  };

  return (
    <List isLoading={isLoading} navigationTitle="Terminal" searchBarPlaceholder="Search for an app...">
      <List.Item
        actions={
          <ActionPanel>
            <Action onAction={resetTerminal} title="Reset to Default" />
          </ActionPanel>
        }
        icon={Icon.ArrowCounterClockwise}
        subtitle="Use the default terminal from settings"
        title="Default"
      />
      {apps?.map((app) => (
        <List.Item
          actions={
            <ActionPanel>
              <Action icon={Icon.Check} onAction={() => setTerminal(app)} title="Select App" />
            </ActionPanel>
          }
          icon={{ fileIcon: app.path }}
          key={app.bundleId || app.path}
          title={app.name}
        />
      ))}
    </List>
  );
}
