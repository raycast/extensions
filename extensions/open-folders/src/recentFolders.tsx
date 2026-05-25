import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { basename } from "path";
import { clearRecentFolders, getRecentFolders } from "./utils/storage";

export default function Command() {
  const [recent, setRecent] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getRecentFolders()
      .then(setRecent)
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Could not load recent folders" }))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recent folders...">
      {recent.length === 0 && !isLoading ? (
        <List.EmptyView title="No Recent Folders" description="Folders you open will appear here." />
      ) : (
        recent.map((path, i) => (
          <List.Item
            key={`${path}-${i}`}
            icon={{ fileIcon: path }}
            title={basename(path)}
            subtitle={path}
            actions={
              <ActionPanel>
                <Action.Open title="Open in Finder" target={path} />
                <Action.ShowInFinder title="Show in Finder" path={path} />
                <Action.CopyToClipboard title="Copy Path" content={path} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                <Action
                  title="Clear Recent Folders"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={async () => {
                    await clearRecentFolders();
                    setRecent([]);
                    await showToast({ style: Toast.Style.Success, title: "Recent folders cleared" });
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
