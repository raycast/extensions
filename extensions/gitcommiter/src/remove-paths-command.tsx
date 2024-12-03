import { ActionPanel, List, Action, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

export default function RemovePathsCommand() {
  const [savedPaths, setSavedPaths] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPaths() {
      const paths = await LocalStorage.getItem<string>("gitPaths");
      if (paths) {
        setSavedPaths(JSON.parse(paths));
      }
    }
    fetchPaths();
  }, []);

  async function handleRemovePath(pathToRemove: string) {
    const updatedPaths = savedPaths.filter((path) => path !== pathToRemove);
    setSavedPaths(updatedPaths);
    await LocalStorage.setItem("gitPaths", JSON.stringify(updatedPaths));
    showToast(Toast.Style.Success, "Path Removed");
  }

  function formatPath(path: string) {
    const parts = path.split("/");
    return parts.length > 1 ? parts.slice(-2).join("/") : path;
  }

  return (
    <List searchBarPlaceholder="Search saved paths" isShowingDetail>
      {savedPaths.map((path) => (
        <List.Item
          key={path}
          title={formatPath(path)}
          detail={<List.Item.Detail markdown={`**Full Path:** ${path}`} />}
          actions={
            <ActionPanel>
              <Action title="Remove Path" onAction={() => handleRemovePath(path)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
