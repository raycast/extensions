import {
  Action,
  ActionPanel,
  Application,
  getApplications,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { execFile } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";
import { SavedApp } from "./types";
import { closeApps } from "./utils";

const execFileAsync = promisify(execFile);

interface ExtendedApplication extends Application {
  keywords?: string[];
}

export default function Command() {
  const [savedApps, setSavedApps] = useState<SavedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await LocalStorage.getItem<string>("group-apps");
        if (stored) {
          setSavedApps(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load apps", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem("group-apps", JSON.stringify(savedApps));
    }
  }, [savedApps, isLoading]);

  const handleRemoveApp = (bundleId: string) => {
    setSavedApps((prev) => prev.filter((app) => app.bundleId !== bundleId));
    showToast({ title: "App Removed", message: "Removed from group" });
  };

  const handleCloseAll = async () => {
    if (savedApps.length === 0) {
      showHUD("No apps in the group to close");
      return;
    }

    showToast({ title: "Closing apps...", style: Toast.Style.Animated });

    const { failedApps } = await closeApps(savedApps);

    if (failedApps.length > 0) {
      showHUD(`Skipped ${failedApps.length} apps: ${failedApps.join(", ")}`);
    } else {
      showHUD("Quit commands sent");
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search apps in group..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Add App to Group"
            icon={Icon.Plus}
            target={<AddAppView currentApps={savedApps} onAdd={(app) => setSavedApps((prev) => [...prev, app])} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Close All Apps"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={handleCloseAll}
          />
        </ActionPanel>
      }
    >
      {savedApps.length === 0 ? (
        <List.EmptyView
          title="No apps in group"
          description="Add apps to the group to manage them together"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add App to Group"
                icon={Icon.Plus}
                target={<AddAppView currentApps={savedApps} onAdd={(app) => setSavedApps((prev) => [...prev, app])} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        savedApps.map((app) => (
          <List.Item
            key={app.bundleId}
            title={app.name}
            icon={{ fileIcon: app.path }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add App to Group"
                  icon={Icon.Plus}
                  target={
                    <AddAppView currentApps={savedApps} onAdd={(newApp) => setSavedApps((prev) => [...prev, newApp])} />
                  }
                />
                <Action
                  title="Remove from Group"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemoveApp(app.bundleId)}
                />
                <Action
                  title="Close All Apps"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                  onAction={handleCloseAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddAppView({ currentApps, onAdd }: { currentApps: SavedApp[]; onAdd: (app: SavedApp) => void }) {
  const [apps, setApps] = useState<ExtendedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    let isMounted = true;

    const fetchApps = async () => {
      try {
        // Load cached keywords
        const cachedKeywordsJson = await LocalStorage.getItem<string>("app_keywords");
        const cachedKeywords: Record<string, string[]> = cachedKeywordsJson ? JSON.parse(cachedKeywordsJson) : {};
        let keywordsDirty = false;

        // 1. Get standard apps from Raycast
        const standardApps = await getApplications();

        // 2. Search for external apps (restrict to /Volumes to optimize speed)
        // We only look in /Volumes because standard locations are covered by getApplications
        const { stdout } = await execFileAsync("mdfind", [
          "-onlyin",
          "/Volumes",
          "kMDItemContentType == 'com.apple.application-bundle'",
        ]);
        const mdfindPaths = stdout.split("\n").filter((p) => {
          const path = p.trim();
          // Filter out empty lines, non-app files, and nested apps (helpers inside .app)
          return path.length > 0 && path.endsWith(".app") && !path.includes(".app/");
        });

        // Create a map of existing bundle IDs to avoid duplicates
        const appMap = new Map<string, ExtendedApplication>();

        // Add standard apps first
        for (const app of standardApps) {
          if (app.bundleId) {
            appMap.set(app.bundleId, {
              ...app,
              keywords: cachedKeywords[app.bundleId],
            });
          }
        }

        const standardPaths = new Set(standardApps.map((a) => a.path));
        const newPaths = mdfindPaths.filter((p) => !standardPaths.has(p));

        for (const path of newPaths) {
          try {
            // Optimized: just get bundle ID to ensure it's a valid app
            const { stdout: idOut } = await execFileAsync("mdls", ["-name", "kMDItemCFBundleIdentifier", "-raw", path]);
            const bundleId = idOut.trim();

            if (bundleId && bundleId !== "(null)") {
              const name = path.split("/").pop()?.replace(".app", "") || "Unknown";
              if (!appMap.has(bundleId)) {
                appMap.set(bundleId, {
                  bundleId,
                  name,
                  path,
                  keywords: cachedKeywords[bundleId],
                });
              }
            }
          } catch {
            // Ignore errors for individual files
          }
        }

        const allApps = Array.from(appMap.values());

        // Filter out apps already in the group
        const existingBundleIds = new Set(currentApps.map((a) => a.bundleId));
        const filteredApps = allApps.filter((app) => !existingBundleIds.has(app.bundleId || ""));

        if (isMounted) {
          setApps(filteredApps);
          setIsLoading(false);
        }

        // Background: Fetch localized names for apps that don't have them in cache
        const appsNeedingUpdate = filteredApps.filter((app) => !cachedKeywords[app.bundleId || ""]);

        if (appsNeedingUpdate.length > 0) {
          const chunkSize = 10;
          for (let i = 0; i < appsNeedingUpdate.length; i += chunkSize) {
            if (!isMounted) break;
            const chunk = appsNeedingUpdate.slice(i, i + chunkSize);
            const updates = await Promise.all(
              chunk.map(async (app) => {
                try {
                  const { stdout } = await execFileAsync("mdls", ["-name", "kMDItemDisplayName", "-raw", app.path]);
                  const displayName = stdout.trim();
                  if (displayName && displayName !== "(null)" && displayName !== app.name) {
                    return { bundleId: app.bundleId, keywords: [displayName] };
                  }
                } catch {
                  // ignore
                }
                // Return empty keywords to cache that we checked this app
                return { bundleId: app.bundleId, keywords: [] };
              }),
            );

            if (!isMounted) break;

            // Update state and cache
            const validUpdates = updates.filter((u) => u && u.bundleId) as { bundleId: string; keywords: string[] }[];

            if (validUpdates.length > 0) {
              validUpdates.forEach((u) => {
                cachedKeywords[u.bundleId] = u.keywords;
              });
              keywordsDirty = true;

              setApps((prev) => {
                const newApps = [...prev];
                validUpdates.forEach((u) => {
                  const index = newApps.findIndex((a) => a.bundleId === u.bundleId);
                  if (index !== -1) {
                    newApps[index] = { ...newApps[index], keywords: u.keywords };
                  }
                });
                return newApps;
              });
            }
          }

          if (keywordsDirty && isMounted) {
            await LocalStorage.setItem("app_keywords", JSON.stringify(cachedKeywords));
          }
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchApps();

    return () => {
      isMounted = false;
    };
  }, [currentApps]);

  const handleAdd = (app: Application) => {
    if (!app.bundleId) return;
    onAdd({
      bundleId: app.bundleId,
      name: app.name,
      path: app.path,
    });
    showToast({ title: "Added", message: app.name });
    pop();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select an app to add...">
      {apps.map((app) => (
        <List.Item
          key={app.bundleId ?? app.path}
          title={app.name}
          keywords={app.keywords}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title="Add to Group" icon={Icon.Plus} onAction={() => handleAdd(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
