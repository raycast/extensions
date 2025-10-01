import {
  List,
  showToast,
  Toast,
  closeMainWindow,
  ActionPanel,
  Action,
  Form,
  useNavigation,
  LocalStorage,
  Image,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Cache for installed applications
let installedAppsCache: App[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

interface App {
  name: string;
  windowTitle: string;
  isRunning: boolean;
  bundlePath?: string;
}

async function getRunningApps(): Promise<App[]> {
  try {
    // Ultra-fast lsappinfo visibleProcessList - 5ms execution time
    const { stdout } = await execAsync(`lsappinfo visibleProcessList`);
    const apps: App[] = [];

    if (stdout.trim()) {
      // Parse: ASN:0x0-0x123-"AppName": ASN:0x0-0x456-"AppName2":
      const matches = stdout.match(/ASN:[^-]+-[^-]+-"([^"]+)"/g);
      if (matches) {
        for (const match of matches) {
          const appNameMatch = match.match(/"([^"]+)"/);
          if (appNameMatch) {
            const appName = appNameMatch[1].replace(/_/g, " "); // Replace underscores with spaces
            apps.push({
              name: appName,
              windowTitle: "",
              isRunning: true,
            });
          }
        }
      }
    }

    return apps;
  } catch (error) {
    console.error("Error getting running apps:", error);
    return [];
  }
}

async function getInstalledApps(): Promise<App[]> {
  // Check cache first
  const now = Date.now();
  if (installedAppsCache && now - cacheTimestamp < CACHE_DURATION) {
    return installedAppsCache;
  }

  // Set 50ms timeout
  const timeoutPromise = new Promise<App[]>((_, reject) => {
    setTimeout(() => reject(new Error("load installed apps timeout")), 50);
  });

  const scanPromise = async (): Promise<App[]> => {
    const appPaths = [
      "/Applications",
      "/Applications/Utilities",
      "/System/Applications",
      "/System/Applications/Utilities",
      "/System/Library/CoreServices/Applications",
      path.join(process.env.HOME || "", "Applications"),
    ];

    const installedApps: App[] = [];
    const seenApps = new Set<string>();

    for (const appPath of appPaths) {
      try {
        const entries = await readdir(appPath);
        for (const entry of entries) {
          if (entry.endsWith(".app")) {
            const appName = entry.replace(".app", "");
            const fullPath = path.join(appPath, entry);

            // Avoid duplicates
            if (!seenApps.has(appName)) {
              seenApps.add(appName);

              try {
                const stats = await stat(fullPath);
                if (stats.isDirectory()) {
                  installedApps.push({
                    name: appName,
                    windowTitle: "",
                    isRunning: false,
                    bundlePath: fullPath,
                  });
                }
              } catch {
                // Skip apps we can't access
                continue;
              }
            }
          }
        }
      } catch {
        // Skip directories we can't access
        continue;
      }
    }

    return installedApps;
  };

  try {
    const installedApps = await Promise.race([scanPromise(), timeoutPromise]);

    // Update cache
    installedAppsCache = installedApps;
    cacheTimestamp = now;

    return installedApps;
  } catch {
    // On timeout or error, return cached apps or empty array
    return installedAppsCache || [];
  }
}

function getAppIcon(app: App): Image.ImageLike {
  // Use actual app icon if we have a bundle path
  if (app.bundlePath) {
    return { fileIcon: app.bundlePath };
  }

  // Fallback: try to construct path from app name
  const defaultPaths = [
    `/Applications/${app.name}.app`,
    `/System/Applications/${app.name}.app`,
    `/System/Applications/Utilities/${app.name}.app`,
  ];

  // Return first path as fileIcon - Raycast will handle if it doesn't exist
  return { fileIcon: defaultPaths[0] };
}

async function resolveAppName(displayName: string): Promise<string> {
  try {
    // Lazily call lsappinfo list to resolve the proper app name
    const { stdout } = await execAsync(`lsappinfo list`);

    // Find the app block that matches our display name
    const appBlocks = stdout.split(/\n\s*\d+\)\s+"/).slice(1);

    for (const block of appBlocks) {
      const appNameMatch = block.match(/^([^"]+)"/);
      const bundlePathMatch = block.match(/bundle path="([^"]+)"/);

      if (appNameMatch && bundlePathMatch) {
        const blockDisplayName = appNameMatch[1].replace(/_/g, " ");

        if (blockDisplayName === displayName) {
          const bundlePath = bundlePathMatch[1];
          // Extract app name from bundle path: "/Applications/Visual Studio Code.app" -> "Visual Studio Code"
          const match = bundlePath.match(/\/([^/]+)\.app$/);
          return match ? match[1] : displayName;
        }
      }
    }

    // Fallback to display name if not found
    return displayName;
  } catch (error) {
    console.error("Error resolving app name:", error);
    return displayName;
  }
}

async function switchToApp(app: App): Promise<void> {
  try {
    if (app.isRunning) {
      // For running apps, resolve the proper app name
      const appName = await resolveAppName(app.name);
      await execAsync(`open -a "${appName.replace(/"/g, '\\"')}"`);
    } else {
      // For non-running apps, use the bundle path or app name
      const targetPath = app.bundlePath || app.name;
      await execAsync(`open -a "${targetPath.replace(/"/g, '\\"')}"`);
    }
    await closeMainWindow();
  } catch (error) {
    console.error("Error switching to app:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to switch app",
      message: `Could not switch to ${app.name}`,
    });
  }
}

async function getAllApps(recentApps: string[] = []): Promise<App[]> {
  const [runningApps, installedApps] = await Promise.all([getRunningApps(), getInstalledApps()]);

  // Create enhanced matching for running apps
  const runningAppMap = new Map<string, App>();
  const runningAppAliases = new Map<string, string>(); // Maps display name to bundle name

  // Build running apps map and resolve their actual bundle names
  for (const runningApp of runningApps) {
    runningAppMap.set(runningApp.name, runningApp);

    // Try to resolve the bundle name for this running app
    try {
      const bundleName = await resolveAppName(runningApp.name);
      if (bundleName !== runningApp.name) {
        runningAppAliases.set(runningApp.name, bundleName);
      }
    } catch {
      // If we can't resolve, just use the display name
    }
  }

  // Start with all installed apps and mark running ones
  const allApps: App[] = [];
  const processedApps = new Set<string>();

  // Process installed apps and check if they're running
  for (const installedApp of installedApps) {
    if (processedApps.has(installedApp.name)) continue;

    // Check if this installed app is currently running
    let matchingRunningApp: App | null = null;

    // Direct name match
    if (runningAppMap.has(installedApp.name)) {
      matchingRunningApp = runningAppMap.get(installedApp.name)!;
    } else {
      // Check if any running app resolves to this bundle name
      for (const [displayName, bundleName] of runningAppAliases.entries()) {
        if (bundleName === installedApp.name) {
          matchingRunningApp = runningAppMap.get(displayName)!;
          break;
        }
      }
    }

    if (matchingRunningApp) {
      // This installed app is running - use the running app's info but keep bundle path
      allApps.push({
        name: installedApp.name, // Use the proper bundle name
        windowTitle: matchingRunningApp.windowTitle,
        isRunning: true,
        bundlePath: installedApp.bundlePath,
      });
    } else {
      // This installed app is not running
      allApps.push(installedApp);
    }

    processedApps.add(installedApp.name);
  }

  // Add any running apps that weren't found in installed apps (edge case)
  for (const runningApp of runningApps) {
    const bundleName = runningAppAliases.get(runningApp.name) || runningApp.name;
    if (!processedApps.has(bundleName) && !processedApps.has(runningApp.name)) {
      allApps.push({
        ...runningApp,
        name: bundleName, // Use resolved name if available
      });
      processedApps.add(bundleName);
    }
  }

  // Sort: recent apps first, then running apps, then alphabetically
  allApps.sort((a, b) => {
    const aRecentIndex = recentApps.indexOf(a.name);
    const bRecentIndex = recentApps.indexOf(b.name);

    // Both in recent list - sort by recency
    if (aRecentIndex !== -1 && bRecentIndex !== -1) {
      return aRecentIndex - bRecentIndex;
    }

    // One in recent list - recent comes first
    if (aRecentIndex !== -1) return -1;
    if (bRecentIndex !== -1) return 1;

    // Neither in recent list - running apps first, then alphabetically
    if (a.isRunning && !b.isRunning) return -1;
    if (!a.isRunning && b.isRunning) return 1;
    return a.name.localeCompare(b.name);
  });

  return allApps;
}

function searchApps(apps: App[], searchTerm: string, recentApps: string[]): App[] {
  if (!searchTerm || searchTerm === " ") {
    return apps;
  }

  // Remove leading space if present
  const cleanedTerm = searchTerm.startsWith(" ") ? searchTerm.slice(1) : searchTerm;
  if (!cleanedTerm) {
    return apps;
  }

  const searchLower = cleanedTerm.toLowerCase();

  // Score apps based on search criteria
  const scoredApps = apps.map((app) => {
    const appNameLower = app.name.toLowerCase();
    let score = 0;

    // 1. Recent app bonus (higher priority than running)
    const recentIndex = recentApps.indexOf(app.name);
    if (recentIndex !== -1) {
      // More recent = higher score (max 200 points)
      score += 100 - recentIndex * 5;
    }

    // 2. Running app bonus
    if (app.isRunning) {
      score += 200;
    }

    // 3. Partial match anywhere in name
    if (appNameLower.includes(searchLower)) {
      score += 400;
      // Boost if match is closer to beginning
      const index = appNameLower.indexOf(searchLower);
      score += Math.max(0, 50 - index);
    }

    // 4. Abbreviation match (e.g., 'vsc' for 'Visual Studio Code')
    const words = appNameLower.split(/[\s\-_]+/);
    const abbreviation = words.map((word) => word.charAt(0).toLowerCase()).join("");
    if (abbreviation.includes(searchLower)) {
      score += 800;
    }

    // 5. Full match from beginning (highest priority)
    if (appNameLower.startsWith(searchLower)) {
      score += 1000;
    }

    return { app, score };
  });

  // Filter out apps with no score and sort by score
  return scoredApps
    .filter((item) => item.score >= 400)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.app);
}

// Storage keys
const HOTKEY_STORAGE_KEY = "instant-application-switcher-hotkeys";
const RECENT_APPS_STORAGE_KEY = "instant-application-switcher-recent-applications";
const MAX_RECENT_APPS = 25;

// Load hotkey assignments from LocalStorage
async function loadHotkeyAssignments(): Promise<Map<string, string>> {
  try {
    const stored = await LocalStorage.getItem<string>(HOTKEY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Error loading hotkey assignments:", error);
  }
  return new Map();
}

// Save hotkey assignments to LocalStorage
async function saveHotkeyAssignments(assignments: Map<string, string>): Promise<void> {
  try {
    const obj = Object.fromEntries(assignments);
    await LocalStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error("Error saving hotkey assignments:", error);
    throw error;
  }
}

// Load recent apps from LocalStorage
async function loadRecentApps(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(RECENT_APPS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading recent apps:", error);
  }
  return [];
}

// Save recent apps to LocalStorage
async function saveRecentApps(recentApps: string[]): Promise<void> {
  try {
    await LocalStorage.setItem(RECENT_APPS_STORAGE_KEY, JSON.stringify(recentApps));
  } catch (error) {
    console.error("Error saving recent apps:", error);
  }
}

// Add app to recent list
async function addToRecentApps(appName: string, currentRecent: string[]): Promise<string[]> {
  // Remove app if it already exists
  const filtered = currentRecent.filter((name) => name !== appName);
  // Add to front
  const newRecent = [appName, ...filtered];
  // Keep only last 25
  const trimmed = newRecent.slice(0, MAX_RECENT_APPS);
  // Save to storage
  await saveRecentApps(trimmed);
  return trimmed;
}

function HotkeyAssignmentForm({ app, onAssign }: { app: App; onAssign: (hotkey: string) => Promise<void> }) {
  const [hotkey, setHotkey] = useState("");
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Assign Hotkey"
            onSubmit={async (values: { hotkey: string }) => {
              if (values.hotkey && values.hotkey.trim()) {
                await onAssign(values.hotkey.trim().toLowerCase());
                pop();
              }
            }}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hotkey"
        title="Hotkey"
        placeholder="Enter hotkey sequence (e.g., f or ff)"
        value={hotkey}
        onChange={setHotkey}
        info="Enter a character or sequence that will be used as a hotkey for this app"
      />
      <Form.Description title="App" text={app.name} />
    </Form>
  );
}

export default function Command() {
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [hotkeyAssignments, setHotkeyAssignments] = useState<Map<string, string>>(new Map());
  const [hotkeysLoaded, setHotkeysLoaded] = useState(false);
  const [recentApps, setRecentApps] = useState<string[]>([]);
  const { push } = useNavigation();

  async function assignHotkey(app: App, hotkey: string) {
    try {
      // Check for conflicts
      for (const existingHotkey of hotkeyAssignments.keys()) {
        // Check if new hotkey starts with existing (e.g., "ff" conflicts with "f")
        if (hotkey.startsWith(existingHotkey)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Hotkey Conflict",
            message: `"${hotkey}" conflicts with existing hotkey "${existingHotkey}"`,
          });
          return;
        }
        // Check if existing hotkey starts with new (e.g., "f" conflicts with "ff")
        if (existingHotkey.startsWith(hotkey)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Hotkey Conflict",
            message: `"${hotkey}" conflicts with existing hotkey "${existingHotkey}"`,
          });
          return;
        }
      }

      // Update the hotkey assignments
      const newAssignments = new Map(hotkeyAssignments);
      newAssignments.set(hotkey, app.name);

      // Save to LocalStorage
      await saveHotkeyAssignments(newAssignments);

      // Update state
      setHotkeyAssignments(newAssignments);

      await showToast({
        style: Toast.Style.Success,
        title: "Hotkey Assigned",
        message: `"${hotkey}" assigned to ${app.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to assign hotkey",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function removeHotkey(app: App, hotkey: string) {
    try {
      // Remove the hotkey assignment
      const newAssignments = new Map(hotkeyAssignments);
      newAssignments.delete(hotkey);

      // Save to LocalStorage
      await saveHotkeyAssignments(newAssignments);

      // Update state
      setHotkeyAssignments(newAssignments);

      await showToast({
        style: Toast.Style.Success,
        title: "Hotkey Removed",
        message: `"${hotkey}" removed from ${app.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove hotkey",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSwitchToApp(app: App) {
    // Track app usage
    const newRecent = await addToRecentApps(app.name, recentApps);
    setRecentApps(newRecent);
    await switchToApp(app);
  }

  function handleSearchTextChange(text: string) {
    // Check if this is a hotkey (no leading space)
    if (hotkeysLoaded && text.length > 0 && !text.startsWith(" ")) {
      const appName = hotkeyAssignments.get(text.toLowerCase());
      if (appName) {
        // Switch immediately without waiting for apps list
        handleSwitchToApp({ name: appName, windowTitle: "", isRunning: false });
        return;
      }
    }

    setSearchText(text);
  }

  // Create reverse hotkey map for O(1) lookups
  const reverseHotkeyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [hotkey, appName] of hotkeyAssignments.entries()) {
      map.set(appName, hotkey);
    }
    return map;
  }, [hotkeyAssignments]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load hotkeys and recent apps first
        const [assignments, recent] = await Promise.all([loadHotkeyAssignments(), loadRecentApps()]);

        setHotkeyAssignments(assignments);
        setHotkeysLoaded(true);
        setRecentApps(recent);

        // Then load apps with recent data (already sorted by getAllApps)
        const allApps = await getAllApps(recent);
        if (allApps.length === 0) {
          setError("No applications found");
        } else {
          setApps(allApps);
        }
      } catch (err) {
        setError("Failed to get applications: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (error) {
    return (
      <List>
        <List.Item title="Error" subtitle={error} icon="⚠️" />
      </List>
    );
  }

  // Get filtered apps based on search
  const filteredApps = searchText ? searchApps(apps, searchText, recentApps) : apps;

  // Helper to get hotkey for an app
  function getHotkeyForApp(appName: string): string | undefined {
    return reverseHotkeyMap.get(appName);
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type hotkey or space + app name to search..."
    >
      {filteredApps.map((app) => {
        const hotkey = getHotkeyForApp(app.name);
        const appTitle = app.name;
        let subtitle = "";
        if (hotkey) {
          subtitle += `[${hotkey}] `;
        }
        if (app.isRunning) {
          subtitle += "Running";
        }

        return (
          <List.Item
            key={`${app.name}-${app.bundlePath || ""}`}
            title={appTitle}
            subtitle={subtitle}
            icon={getAppIcon(app)}
            actions={
              <ActionPanel>
                <Action title={app.isRunning ? "Switch" : "Launch"} onAction={() => handleSwitchToApp(app)} />
                <Action
                  title="Assign Hotkey"
                  onAction={() =>
                    push(<HotkeyAssignmentForm app={app} onAssign={(hotkey) => assignHotkey(app, hotkey)} />)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                {hotkey && (
                  <Action
                    title="Remove Hotkey"
                    onAction={() => removeHotkey(app, hotkey)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
