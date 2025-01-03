import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { findRelatedFiles } from "../utils/file-finder";
import { AppListProps } from "../types";

export default function AppList({
  isLoading,
  applications,
  setSelectedApp,
  setRelatedFiles,
  setCurrentView,
}: AppListProps) {
  return (
    <List isLoading={isLoading}>
      {applications.map((app) => (
        <List.Item
          key={app.path}
          icon={{ fileIcon: app.path }}
          title={app.name}
          actions={
            <ActionPanel>
              <Action
                title="Choose App"
                icon={Icon.Trash}
                style={Action.Style.Regular}
                onAction={async () => {
                  const files = await findRelatedFiles(app);
                  setSelectedApp(app);
                  setRelatedFiles(files);
                  setCurrentView("fileList");
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
