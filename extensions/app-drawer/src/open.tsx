import { useEffect, useMemo, useState } from "react";
import { Application, Grid, Icon, getApplications, getPreferenceValues } from "@raycast/api";
import { useDrawerConfig } from "./storage";
import { getLaunchpadBundleIds } from "./launchpad";
import { generateFolderIcon } from "./folder-icon";
import { reconcileApps } from "./utils";
import { AppActionPanel, FolderItemActionPanel } from "./actions";

interface Preferences {
  columns: string;
}

export default function Command() {
  const { config, updateConfig, isLoading: configLoading } = useDrawerConfig();
  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  const preferences = getPreferenceValues<Preferences>();
  const columns = parseInt(preferences.columns, 10) || 7;

  const [launchpadIds, setLaunchpadIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setLaunchpadIds(getLaunchpadBundleIds());
    getApplications().then((allApps) => {
      setApps(allApps);
      setAppsLoading(false);
    });
  }, []);

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
  const launchpadAvailable = launchpadIds !== null;

  const folderMap = useMemo(() => new Map(reconciledConfig.folders.map((f) => [f.id, f])), [reconciledConfig.folders]);

  return (
    <Grid isLoading={isLoading} columns={columns} searchBarPlaceholder="Search applications...">
      {reconciledConfig.gridOrder.map((entry, gridIndex) => {
        if (entry.type === "folder") {
          const folder = folderMap.get(entry.folderId);
          if (!folder) return null;
          const appPaths = folder.appBundleIds.map((id) => appMap.get(id)?.path).filter(Boolean) as string[];
          const folderIcon = generateFolderIcon(appPaths);
          return (
            <Grid.Item
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
