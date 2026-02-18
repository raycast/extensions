import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { type Application, getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { saveStoredApp } from "@/utils/storage";

interface SelectEditorProps {
  onReset?: () => void;
  onSelect?: (app: Application) => void;
}

export default function SelectEditor({ onReset, onSelect }: SelectEditorProps) {
  const { pop } = useNavigation();
  const { data: apps, isLoading } = usePromise(getApplications);

  const handleSelect = async (app: Application) => {
    if (onSelect) {
      onSelect(app);
      pop();

      return;
    }

    await saveStoredApp({ bundleId: app.bundleId || "", name: app.name });
    await showToast({ message: app.name, style: Toast.Style.Success, title: "App Updated" });

    pop();
  };

  const handleReset = async () => {
    if (onReset) {
      onReset();
    }

    pop();
  };

  return (
    <List isLoading={isLoading} navigationTitle="Select App" searchBarPlaceholder="Search for an app...">
      {onReset && (
        <List.Item
          actions={
            <ActionPanel>
              <Action onAction={handleReset} title="Reset to Default" />
            </ActionPanel>
          }
          icon={Icon.ArrowCounterClockwise}
          subtitle="Use the default application"
          title="Default"
        />
      )}
      {apps?.map((app) => (
        <List.Item
          actions={
            <ActionPanel>
              <Action icon={Icon.Check} onAction={() => handleSelect(app)} title="Select App" />
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
