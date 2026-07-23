import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { getPlugins, getInstalledTools } from "./mise";
import ToolVersions from "./tool-versions";
import type { MiseInstalledTools } from "./types";

export default function Search() {
  const fetchPlugins = useCallback(async () => {
    return await getPlugins();
  }, []);

  const fetchInstalled = useCallback(async () => {
    return await getInstalledTools();
  }, []);

  const {
    isLoading: pluginsLoading,
    data: plugins,
    error: pluginsError,
    revalidate: revalidatePlugins,
  } = usePromise(fetchPlugins);

  const { isLoading: installedLoading, data: installedData } =
    usePromise(fetchInstalled);

  const installedSet = useMemo(() => {
    const data = (installedData ?? {}) as MiseInstalledTools;
    const set = new Set<string>();
    for (const [plugin, versions] of Object.entries(data)) {
      if (versions.some((v) => v.installed)) {
        set.add(plugin);
      }
    }
    return set;
  }, [installedData]);

  const sortedPlugins = useMemo(() => {
    const list = plugins ?? [];
    return [...list].sort((a, b) => {
      const aInstalled = installedSet.has(a);
      const bInstalled = installedSet.has(b);
      if (aInstalled && !bInstalled) return -1;
      if (!aInstalled && bInstalled) return 1;
      return a.localeCompare(b);
    });
  }, [plugins, installedSet]);

  const isLoading = pluginsLoading || installedLoading;

  if (pluginsError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Fetch Plugins"
          description={`Failed to list available plugins. Error: ${pluginsError.message}`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={revalidatePlugins}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search packages...">
      {sortedPlugins.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Packages Found"
          description="No packages available from the mise registry."
        />
      ) : (
        sortedPlugins.map((plugin) => {
          const isInstalled = installedSet.has(plugin);
          return (
            <List.Item
              key={plugin}
              title={plugin}
              icon={
                isInstalled
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : Icon.Box
              }
              accessories={
                isInstalled
                  ? [{ tag: { value: "Installed", color: Color.Green } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Versions"
                    icon={Icon.List}
                    target={<ToolVersions plugin={plugin} mode="install" />}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
