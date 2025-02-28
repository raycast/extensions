import { ActionPanel, Detail, List, Action, Icon, Application, showHUD, showToast, Toast } from "@raycast/api";
import useDirectories from "./hooks/useDirectories";
import { openInEditor } from "./utils/openEditor";
import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";

interface Preferences {
  preferredEditor: Application;
}

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { data, isLoading, error } = useDirectories();
  const [input, setInput] = useState<string>("");

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <Detail markdown={`Error: ${error.message}`} />;
  }

  return (
    <List filtering={true} onSearchTextChange={setInput}>
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
                  try {
                    openInEditor("code", path);
                    await showHUD("🚀 Project opened in Visual Studio Code.");
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Error",
                      message: (error as Error).message,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {input && (
        <List.Item
          title={`Create Project: ${input}`}
          icon={Icon.NewFolder}
          actions={
            <ActionPanel>
              <Action
                title={`Create Project`}
                onAction={async () => {
                  try {
                    openInEditor("code", input);
                    await showHUD("✨ Project created and opened in Visual Studio Code.");
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Error",
                      message: (error as Error).message,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
