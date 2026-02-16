import { Action, ActionPanel, Icon, List, useNavigation, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getApplications, type Application } from "@raycast/api";

import { saveStoredApp } from "../utils/storage";
import { useI18n } from "../hooks/useI18n";

interface SelectEditorProps {
  onSelect?: (app: Application) => void;
  onReset?: () => void;
}

export default function SelectEditor({ onSelect, onReset }: SelectEditorProps) {
  const { pop } = useNavigation();
  const { isLoading, data: apps } = usePromise(getApplications);
  const { t } = useI18n();

  const setEditor = async (app: Application) => {
    if (onSelect) {
      onSelect(app);
      pop();
      return;
    }

    await saveStoredApp({ name: app.name, bundleId: app.bundleId || "" });
    await showToast({ style: Toast.Style.Success, title: t("settings.toasts.appUpdated"), message: app.name });
    pop();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("selectEditor.search")}
      navigationTitle={t("selectEditor.title")}
    >
      {onReset && (
        <List.Item
          title={t("selectEditor.default.title")}
          subtitle={t("selectEditor.default.subtitle")}
          icon={Icon.ArrowCounterClockwise}
          actions={
            <ActionPanel>
              <Action
                title={t("selectEditor.default.action")}
                onAction={() => {
                  onReset();
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {apps?.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title={t("selectEditor.action")} icon={Icon.Check} onAction={() => setEditor(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
