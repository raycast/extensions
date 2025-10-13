import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AppInfo } from "./types";
import { discoverApps, createInitialApps, updateDisplayNamesInBatches } from "./services/appDiscovery";
import { loadTags } from "./services/tagStorage";
import { toPinyin } from "./utils/pinyin";
import TagManagementForm from "./components/TagManagementForm";

export default function Command() {
  const loadApps = async (): Promise<AppInfo[]> => {
    const tagMap = await loadTags();
    const paths = discoverApps();
    return createInitialApps(paths, tagMap);
  };

  const {
    data: apps = [],
    isLoading,
    mutate,
  } = useCachedPromise(
    async () => {
      const initialApps = await loadApps();
      const paths = initialApps.map((app) => app.path);

      // Start background updates for Chinese display names
      updateDisplayNamesInBatches(paths, (updates) => {
        const updatedApps = initialApps.map((app) => {
          const newDisplayName = updates[app.path];
          return newDisplayName ? { ...app, displayName: newDisplayName } : app;
        });
        // Trigger re-render with updated names
        mutate(Promise.resolve(updatedApps), { optimisticUpdate: () => updatedApps });
      });

      return initialApps;
    },
    [],
    {
      onError: (error: Error) => {
        console.error("Error loading apps:", error);
        showToast(Toast.Style.Failure, "Failed to load apps");
      },
    },
  );

  const handleAppUpdate = (updatedApp: AppInfo) => {
    const updatedApps = apps.map((a) => (a.path === updatedApp.path ? updatedApp : a));
    mutate(Promise.resolve(updatedApps));
  };

  const openTagManagement = (app: AppInfo) => {
    return <TagManagementForm app={app} onAppUpdate={handleAppUpdate} />;
  };

  return (
    <List searchBarPlaceholder="Search apps or tags…" isLoading={isLoading}>
      {apps.map((app) => (
        <List.Item
          key={app.path}
          title={app.displayName}
          icon={{ fileIcon: app.path }}
          accessories={app.tags.map((t) => ({ tag: t }))}
          keywords={[app.name, app.displayName, toPinyin(app.displayName), ...app.tags]}
          actions={
            <ActionPanel>
              <Action.Push title="Manage Tags" icon={Icon.Tag} target={openTagManagement(app)} />
              <Action.Open title="Open App" target={app.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
