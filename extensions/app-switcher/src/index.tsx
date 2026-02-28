import { Grid, Icon, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  getCachedRunningApps,
  getRunningApps,
  getMinimizedStatus,
  setCachedRunningApps,
} from "./get-running-apps";
import { getExcludedApps } from "./excluded-apps";
import { AppActions } from "./app-actions";
import { AppGridItem, Preferences, RunningApp } from "./types";

function normalizeOrderPreference(
  value: string | undefined,
): Preferences["appOrder"] {
  return value === "alphabetical" ? "alphabetical" : "most-recent";
}

function normalizeIconSizePreference(
  value: string | undefined,
): Preferences["iconSize"] {
  if (value === "small" || value === "medium" || value === "large")
    return value;
  return "medium";
}

function normalizeViewModePreference(
  value: string | undefined,
): Preferences["viewMode"] {
  return value === "list" ? "list" : "grid";
}

function toGridItemSize(iconSize: Preferences["iconSize"]): Grid.ItemSize {
  if (iconSize === "small") return Grid.ItemSize.Small;
  if (iconSize === "large") return Grid.ItemSize.Large;
  return Grid.ItemSize.Medium;
}

function toGridColumns(iconSize: Preferences["iconSize"]): number {
  if (iconSize === "small") return 12;
  if (iconSize === "large") return 5;
  return 7;
}

export default function AppSwitcher() {
  const preferences = getPreferenceValues<Preferences>();
  const appOrder = normalizeOrderPreference(
    (preferences as { appOrder?: string }).appOrder,
  );
  const iconSize = normalizeIconSizePreference(
    (preferences as { iconSize?: string }).iconSize,
  );
  const viewMode = normalizeViewModePreference(
    (preferences as { viewMode?: string }).viewMode,
  );

  const {
    data: runningApps,
    isLoading: appsLoading,
    revalidate,
  } = usePromise(getRunningApps);

  const [cachedRunningApps, setCachedRunningAppsState] = useState<
    RunningApp[] | null
  >(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const cached = await getCachedRunningApps();
      if (!mounted) return;
      setCachedRunningAppsState(cached);
      setCacheLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!runningApps) return;
    setCachedRunningAppsState(runningApps);
    void setCachedRunningApps(runningApps);
  }, [runningApps]);

  const visibleRunningApps = runningApps ?? cachedRunningApps;

  const { data: minimizedMap } = usePromise(getMinimizedStatus, [], {
    execute: !!visibleRunningApps,
  });

  const { data: excludedApps, isLoading: excludeLoading } =
    usePromise(getExcludedApps);

  const enrichedApps = useMemo((): RunningApp[] | null => {
    if (!visibleRunningApps) return null;
    if (!minimizedMap) return visibleRunningApps;
    return visibleRunningApps.map((app) => {
      const statuses = minimizedMap[app.bundleId];
      if (!statuses) return app;
      return {
        ...app,
        windows: app.windows.map((win) => ({
          ...win,
          minimized: statuses[win.index] ?? false,
        })),
      };
    });
  }, [visibleRunningApps, minimizedMap]);

  const { activeItems, minimizedItems, noWindowItems } = useMemo(() => {
    const empty = {
      activeItems: [] as AppGridItem[],
      minimizedItems: [] as AppGridItem[],
      noWindowItems: [] as AppGridItem[],
    };
    if (!enrichedApps || !excludedApps) return empty;

    const excludedSet = new Set(excludedApps);
    let apps = enrichedApps.filter((app) => !excludedSet.has(app.bundleId));

    if (appOrder === "alphabetical") {
      apps = [...apps].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      apps = [...apps].sort((a, b) => {
        if (a.frontmost !== b.frontmost) return a.frontmost ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    const active: AppGridItem[] = [];
    const minimized: AppGridItem[] = [];
    const noWindow: AppGridItem[] = [];

    for (const app of apps) {
      if (app.windows.length === 0) {
        noWindow.push({
          id: `${app.bundleId}-no-window`,
          appName: app.name,
          bundleId: app.bundleId,
          appPath: app.appPath,
          windowIndex: -1,
          minimized: false,
          hasWindows: false,
          frontmost: app.frontmost,
        });
        continue;
      }

      const multiWindow = app.windows.length > 1;

      for (const win of app.windows) {
        const item: AppGridItem = {
          id: `${app.bundleId}-w${win.index}`,
          appName: app.name,
          bundleId: app.bundleId,
          appPath: app.appPath,
          windowTitle: multiWindow ? win.title || app.name : undefined,
          windowIndex: win.index,
          minimized: win.minimized,
          hasWindows: true,
          frontmost: app.frontmost && !win.minimized,
        };

        if (win.minimized) {
          minimized.push(item);
        } else {
          active.push(item);
        }
      }
    }

    return {
      activeItems: active,
      minimizedItems: minimized,
      noWindowItems: noWindow,
    };
  }, [appOrder, enrichedApps, excludedApps]);

  if (viewMode === "list") {
    return (
      <List
        isLoading={
          !visibleRunningApps && (appsLoading || !cacheLoaded || excludeLoading)
        }
        searchBarPlaceholder="Filter apps..."
        filtering={{ keepSectionOrder: true }}
      >
        {activeItems.length > 0 && (
          <List.Section title="Active">
            {activeItems.map((item) => (
              <List.Item
                key={item.id}
                icon={
                  item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
                }
                title={item.windowTitle || item.appName}
                subtitle={item.windowTitle ? item.appName : undefined}
                keywords={[item.appName, item.windowTitle ?? "", item.bundleId]}
                actions={<AppActions item={item} revalidate={revalidate} />}
              />
            ))}
          </List.Section>
        )}

        {minimizedItems.length > 0 && (
          <List.Section title="Minimized">
            {minimizedItems.map((item) => (
              <List.Item
                key={item.id}
                icon={
                  item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
                }
                title={item.windowTitle || item.appName}
                subtitle={item.windowTitle ? item.appName : undefined}
                keywords={[item.appName, item.windowTitle ?? "", item.bundleId]}
                actions={<AppActions item={item} revalidate={revalidate} />}
              />
            ))}
          </List.Section>
        )}

        {noWindowItems.length > 0 && (
          <List.Section title="No Windows">
            {noWindowItems.map((item) => (
              <List.Item
                key={item.id}
                icon={
                  item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
                }
                title={item.appName}
                keywords={[item.appName, item.bundleId]}
                actions={<AppActions item={item} revalidate={revalidate} />}
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  return (
    <Grid
      columns={toGridColumns(iconSize)}
      inset={Grid.Inset.Small}
      itemSize={toGridItemSize(iconSize)}
      isLoading={
        !visibleRunningApps && (appsLoading || !cacheLoaded || excludeLoading)
      }
      searchBarPlaceholder="Filter apps..."
      filtering={{ keepSectionOrder: true }}
    >
      {activeItems.length > 0 && (
        <Grid.Section title="Active">
          {activeItems.map((item) => (
            <Grid.Item
              key={item.id}
              content={
                item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
              }
              title={item.windowTitle || item.appName}
              subtitle={item.windowTitle ? item.appName : undefined}
              keywords={[item.appName, item.windowTitle ?? "", item.bundleId]}
              actions={<AppActions item={item} revalidate={revalidate} />}
            />
          ))}
        </Grid.Section>
      )}

      {minimizedItems.length > 0 && (
        <Grid.Section title="Minimized">
          {minimizedItems.map((item) => (
            <Grid.Item
              key={item.id}
              content={
                item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
              }
              title={item.windowTitle || item.appName}
              subtitle={item.windowTitle ? item.appName : undefined}
              keywords={[item.appName, item.windowTitle ?? "", item.bundleId]}
              actions={<AppActions item={item} revalidate={revalidate} />}
            />
          ))}
        </Grid.Section>
      )}

      {noWindowItems.length > 0 && (
        <Grid.Section title="No Windows">
          {noWindowItems.map((item) => (
            <Grid.Item
              key={item.id}
              content={
                item.appPath ? { fileIcon: item.appPath } : Icon.AppWindow
              }
              title={item.appName}
              keywords={[item.appName, item.bundleId]}
              actions={<AppActions item={item} revalidate={revalidate} />}
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
