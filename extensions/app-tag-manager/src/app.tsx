import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { AppInfo } from "./types";
import { discoverApps, createInitialApps, loadDisplayNames, getCachedDisplayNames } from "./services/appDiscovery";
import { loadTags } from "./services/tagStorage";
import { toPinyin } from "./utils/pinyin";
import TagManagementForm from "./components/TagManagementForm";

export default function Command() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasRequestedAppsRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadApps = useCallback(async (): Promise<AppInfo[]> => {
    const startTime = Date.now();
    console.log(`[PERF] Starting loadApps...`);

    try {
      // Load tags and apps in parallel for better performance
      const parallelStart = Date.now();
      const [tagMap, paths] = await Promise.all([loadTags(), discoverApps()]);
      const parallelTime = Date.now() - parallelStart;
      console.log(`[PERF] Parallel loading completed in ${parallelTime}ms`);

      const createStart = Date.now();
      const initialApps = createInitialApps(paths, tagMap);
      const cachedDisplayNames = await getCachedDisplayNames(paths);
      const initialAppsWithNames = initialApps.map((app) => ({
        ...app,
        displayName: cachedDisplayNames[app.path] || app.displayName,
      }));
      const createTime = Date.now() - createStart;
      console.log(
        `[PERF] Created ${initialApps.length} initial apps in ${createTime}ms (${Object.keys(cachedDisplayNames).length} display names from cache)`,
      );

      // Show apps immediately with cached names when available
      if (isMountedRef.current) {
        setApps(initialAppsWithNames);
        console.log(`[PERF] Apps set in UI immediately`);
      }

      // Load display names asynchronously and update apps progressively
      const pathsToLoad = initialApps.map((app) => app.path);
      console.log(`[PERF] Starting async display names load for ${pathsToLoad.length} paths...`);

      void loadDisplayNames(pathsToLoad).then((displayNames) => {
        if (!isMountedRef.current) {
          return;
        }

        const updateStart = Date.now();
        const updatedApps = initialAppsWithNames.map((app) => ({
          ...app,
          displayName: displayNames[app.path] || app.displayName,
        }));
        setApps(updatedApps);
        const updateTime = Date.now() - updateStart;
        console.log(`[PERF] Updated ${Object.keys(displayNames).length} display names in ${updateTime}ms`);
      });

      const totalTime = Date.now() - startTime;
      console.log(`[PERF] loadApps completed in ${totalTime}ms`);
      return initialApps;
    } catch (error) {
      console.error("Error loading apps:", error);
      showToast(Toast.Style.Failure, "Failed to load apps");
      throw error;
    }
  }, []);

  // Load apps once on mount
  useEffect(() => {
    if (hasRequestedAppsRef.current) {
      return;
    }
    hasRequestedAppsRef.current = true;

    loadApps()
      .catch(() => {
        // loadApps already reports the error to the user
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });
  }, [loadApps]);

  const handleAppUpdate = useCallback((updatedApp: AppInfo) => {
    // Optimistic update - update the local state immediately
    setApps((prevApps) => prevApps.map((a) => (a.path === updatedApp.path ? updatedApp : a)));
  }, []);

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
              <Action.Open title="Open App" target={app.path} />
              <Action.Push title="Manage Tags" icon={Icon.Tag} target={openTagManagement(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
