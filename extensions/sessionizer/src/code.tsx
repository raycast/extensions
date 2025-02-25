import { ActionPanel, Detail, List, Action, Icon, closeMainWindow, Application } from "@raycast/api";
import useDirectories from "./hooks/useDirectories";
import { openInEditor } from "./utils/openEditor";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  preferredEditor: Application;
}

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { data, isLoading, error } = useDirectories();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <Detail markdown={`Error: ${error.message}`} />;
  }

  return (
    <List>
      {data.map((path: string, index: number) => (
        <List.Item
          key={index}
          icon={Icon.Folder}
          title={path}
          actions={
            <ActionPanel>
              <Action
                title={`Open in ${preferences.preferredEditor.name}`}
                onAction={async () => {
                  openInEditor("code", path);
                  closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
