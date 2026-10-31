import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getConfiguredFolders, inspectFolder } from "./folders";

async function launchCleanAll(path: string) {
  try {
    await launchCommand({
      name: "clean-all",
      type: LaunchType.UserInitiated,
      context: { folders: [path] },
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could not launch Clean All" });
  }
}

export default function Command() {
  const folders = useMemo(getConfiguredFolders, []);
  const { data, isLoading } = usePromise(async (paths: string[]) => Promise.all(paths.map(inspectFolder)), [folders]);

  return (
    <List isLoading={isLoading}>
      {data?.map((folder) => (
        <List.Item
          key={folder.path}
          title={folder.label}
          subtitle={folder.status === "found" ? `${folder.entries.length} items` : "not found"}
          actions={
            folder.status === "found" ? (
              <ActionPanel>
                <Action
                  title="Clean This Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => launchCleanAll(folder.path)}
                />
              </ActionPanel>
            ) : null
          }
        />
      ))}
    </List>
  );
}
