import { Application, Grid, Icon, getApplications, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { AppActionPanel, FolderItemActionPanel } from "./actions";
import { generateFolderIcon } from "./folder-icon";
import { getLaunchpadBundleIds } from "./launchpad";
import { useDrawerConfig } from "./storage";
import { reconcileApps } from "./utils";

export default function Command() {
  const { config, updateConfig, isLoading: configLoading } = useDrawerConfig();

  const preferences = getPreferenceValues<Preferences>();
  const columns = parseInt(preferences.columns, 10) || 7;

  const { data: appsData, isLoading: appsLoading } = usePromise(async () => {
    const [apps, launchpadIds] = await Promise.all([getApplications(), Promise.resolve(getLaunchpadBundleIds())]);
    return { apps, launchpadIds };
  });

  const apps = appsData?.apps ?? [];
  const launchpadIds = appsData?.launchpadIds ?? null;

  const filteredApps = useMemo(
    () =>
      apps.filter((a): a is Application & { bundleId: string } => {
        if (!a.bundleId) return false;
        // If Launchpad DB is available, use it as the filter source
        if (launchpadIds) return launchpadIds.has(a.bundleId);
        // Fallback: filter by application directories (for macOS Tahoe+ without Launchpad)
        // Covers /Applications/, /System/Applications/, ~/Applications/, Setapp, external volumes
        return a.path.includes("/Applications/");
      }),
    [apps, launchpadIds],
  );

  const appMap = useMemo(() => new Map(filteredApps.map((a) => [a.bundleId, a])), [filteredApps]);

  const reconciledConfig = useMemo(() => reconcileApps(config, filteredApps), [config, filteredApps]);

  useEffect(() => {
    if (!appsLoading && !configLoading && JSON.stringify(reconciledConfig) !== JSON.stringify(config)) {
      updateConfig(reconciledConfig);
    }
  }, [reconciledConfig, config, appsLoading, configLoading, updateConfig]);

  const isLoading = configLoading || appsLoading;
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialLoaded) setInitialLoaded(true);
  }, [isLoading, initialLoaded]);

  const launchpadAvailable = launchpadIds !== null;

  const folderMap = useMemo(() => new Map(reconciledConfig.folders.map((f) => [f.id, f])), [reconciledConfig.folders]);

  // Resolve folder icon paths asynchronously via useCachedPromise
  const folderEntries = useMemo(
    () =>
      reconciledConfig.folders.map((f) => ({
        id: f.id,
        paths: f.appBundleIds.map((bid) => appMap.get(bid)?.path).filter(Boolean) as string[],
      })),
    [reconciledConfig.folders, appMap],
  );

  const { data: folderIcons = {} } = useCachedPromise(
    async (entries: { id: string; paths: string[] }[]) => {
      const icons: Record<string, string | null> = {};
      await Promise.all(
        entries.map(async ({ id, paths }) => {
          icons[id] = await generateFolderIcon(paths);
        }),
      );
      return icons;
    },
    [folderEntries],
  );

  return (
    <Grid isLoading={isLoading} columns={columns} searchBarPlaceholder="Search applications...">
      {!initialLoaded
        ? null
        : reconciledConfig.gridOrder.map((entry, gridIndex) => {
            if (entry.type === "folder") {
              const folder = folderMap.get(entry.folderId);
              if (!folder) return null;
              const folderIcon = folderIcons[folder.id] ?? null;
              return (
                <Grid.Item
                  id={`folder-${folder.id}`}
                  key={`folder-${folder.id}`}
                  content={folderIcon ? { source: folderIcon } : Icon.Folder}
                  title={folder.name}
                  subtitle={`${folder.appBundleIds.length} apps`}
                  keywords={[folder.name, ...folder.appBundleIds.map((id) => appMap.get(id)?.name ?? "")]}
                  actions={
                    <FolderItemActionPanel
                      folder={folder}
                      config={reconciledConfig}
                      updateConfig={updateConfig}
                      appMap={appMap}
                      columns={columns}
                      gridIndex={gridIndex}
                      launchpadAvailable={launchpadAvailable}
                    />
                  }
                />
              );
            } else {
              const app = appMap.get(entry.bundleId);
              if (!app) return null;
              return (
                <Grid.Item
                  id={entry.bundleId}
                  key={entry.bundleId}
                  content={{ fileIcon: app.path }}
                  title={app.name}
                  keywords={[app.name]}
                  actions={
                    <AppActionPanel
                      app={app}
                      config={reconciledConfig}
                      updateConfig={updateConfig}
                      appMap={appMap}
                      folderId={null}
                      index={gridIndex}
                      sectionLength={reconciledConfig.gridOrder.length}
                      launchpadAvailable={launchpadAvailable}
                    />
                  }
                />
              );
            }
          })}
    </Grid>
  );
}
