import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AppInfo } from "./types";
import { discoverApps, createInitialApps, updateDisplayNamesInBatches } from "./services/appDiscovery";
import { loadTags } from "./services/tagStorage";
import { filterApps } from "./utils/search";
import TagManagementForm from "./components/TagManagementForm";

export default function Command() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const tagMap = await loadTags();

      const paths = discoverApps();
      const initialApps = createInitialApps(paths, tagMap);
      setApps(initialApps);

      // 异步更新中文显示名
      updateDisplayNamesInBatches(paths, (updates) => {
        setApps((prevApps) =>
          prevApps.map((app) => {
            const newDisplayName = updates[app.path];
            return newDisplayName ? { ...app, displayName: newDisplayName } : app;
          }),
        );
      });
    } catch (error) {
      console.error("Error loading apps:", error);
      showToast(Toast.Style.Failure, "Failed to load apps");
    }
  };

  const handleTagsUpdate = (appName: string, newTags: string[]) => {
    setApps((prevApps) => prevApps.map((app) => (app.name === appName ? { ...app, tags: newTags } : app)));
  };

  const openTagManagement = (app: AppInfo) => {
    return <TagManagementForm app={app} onTagsUpdate={handleTagsUpdate} />;
  };

  const filteredApps = filterApps(apps, searchText);

  return (
    <List searchBarPlaceholder="Search apps or tags…" onSearchTextChange={setSearchText} searchText={searchText}>
      {filteredApps.map((app) => (
        <List.Item
          key={app.path}
          title={app.displayName}
          icon={{ fileIcon: app.path }}
          accessories={app.tags.map((t) => ({ tag: t }))}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Tags" target={openTagManagement(app)} />
              <Action.Open title="Open App" target={app.path} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
