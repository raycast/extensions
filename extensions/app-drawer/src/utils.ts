import { Application, showToast, Toast } from "@raycast/api";
import { randomUUID } from "crypto";
import { DEFAULT_CONFIG, DrawerConfig, GridEntry } from "./types";

export function generateId(): string {
  return randomUUID();
}

/**
 * Reconcile saved config with currently installed applications.
 * - New apps → appended to gridOrder
 * - Removed apps → removed from gridOrder and folders
 */
export function reconcileApps(
  config: DrawerConfig,
  filteredApps: (Application & { bundleId: string })[],
): DrawerConfig {
  const discoveredIds = new Set(filteredApps.map((a) => a.bundleId));

  // All bundleIds currently tracked (in gridOrder as apps + inside folders)
  const knownAppIds = new Set<string>();
  for (const entry of config.gridOrder) {
    if (entry.type === "app") knownAppIds.add(entry.bundleId);
  }
  for (const folder of config.folders) {
    for (const id of folder.appBundleIds) knownAppIds.add(id);
  }

  // New apps: discovered but not tracked anywhere
  const newAppIds = filteredApps
    .filter((a) => !knownAppIds.has(a.bundleId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => a.bundleId);

  // Remove uninstalled apps from gridOrder and folders
  const gridOrder: GridEntry[] = [
    ...config.gridOrder.filter(
      (entry) => entry.type === "folder" || (entry.type === "app" && discoveredIds.has(entry.bundleId)),
    ),
    ...newAppIds.map((id): GridEntry => ({ type: "app", bundleId: id })),
  ];

  const allFolders = config.folders.map((f) => ({
    ...f,
    appBundleIds: f.appBundleIds.filter((id) => discoveredIds.has(id)),
  }));

  // Clean up folders that became empty after removing uninstalled apps
  const emptyFolderIds = new Set(allFolders.filter((f) => f.appBundleIds.length === 0).map((f) => f.id));
  const folders = allFolders.filter((f) => f.appBundleIds.length > 0);
  const cleanedGridOrder =
    emptyFolderIds.size > 0
      ? gridOrder.filter((e) => !(e.type === "folder" && emptyFolderIds.has(e.folderId)))
      : gridOrder;

  return { ...config, gridOrder: cleanedGridOrder, folders };
}

/**
 * Move an item within an array by swapping positions.
 */
export function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) {
    return arr;
  }
  const result = [...arr];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Sort bundleIds alphabetically by app name.
 */
export function sortByName(bundleIds: string[], appMap: Map<string, Application>): string[] {
  return [...bundleIds].sort((a, b) => {
    const nameA = appMap.get(a)?.name ?? "";
    const nameB = appMap.get(b)?.name ?? "";
    return nameA.localeCompare(nameB);
  });
}

/**
 * Remove an app from its current location (folder or gridOrder).
 * Auto-deletes empty folders and cleans up their gridOrder entries.
 */
export function removeAppFromCurrentLocation(
  config: DrawerConfig,
  bundleId: string,
  folderId: string | null,
): DrawerConfig {
  if (folderId !== null) {
    const folders = config.folders.map((f) =>
      f.id === folderId ? { ...f, appBundleIds: f.appBundleIds.filter((id) => id !== bundleId) } : f,
    );
    const emptyFolder = folders.find((f) => f.id === folderId && f.appBundleIds.length === 0);
    if (emptyFolder) {
      showToast({ style: Toast.Style.Success, title: "Empty folder removed" });
      return {
        ...config,
        folders: folders.filter((f) => f.appBundleIds.length > 0),
        gridOrder: config.gridOrder.filter((e) => !(e.type === "folder" && e.folderId === emptyFolder.id)),
      };
    }
    return { ...config, folders };
  }
  return {
    ...config,
    gridOrder: config.gridOrder.filter((e) => !(e.type === "app" && e.bundleId === bundleId)),
  };
}

/**
 * Remove an app from a folder and place it back into gridOrder.
 * If the folder becomes empty, the app takes the folder's position.
 * Otherwise, the app is inserted after the folder.
 */
export function extractAppFromFolder(config: DrawerConfig, bundleId: string, folderId: string): DrawerConfig {
  const folderGridIdx = config.gridOrder.findIndex((e) => e.type === "folder" && e.folderId === folderId);
  const newConfig = removeAppFromCurrentLocation(config, bundleId, folderId);
  const gridOrder = [...newConfig.gridOrder];
  const folderStillExists = gridOrder.some((e) => e.type === "folder" && e.folderId === folderId);
  const insertIdx = folderStillExists
    ? gridOrder.findIndex((e) => e.type === "folder" && e.folderId === folderId) + 1
    : Math.min(folderGridIdx, gridOrder.length);
  gridOrder.splice(insertIdx, 0, { type: "app", bundleId });
  return { ...newConfig, gridOrder };
}

/**
 * Create a new folder containing the given app.
 * The folder is placed at the app's original gridOrder position.
 */
export function createFolderWithApp(
  config: DrawerConfig,
  bundleId: string,
  folderId: string | null,
  newFolderId: string,
  folderName = "New Folder",
): DrawerConfig {
  const oldIdx = config.gridOrder.findIndex((e) => e.type === "app" && e.bundleId === bundleId);
  const newConfig = removeAppFromCurrentLocation(config, bundleId, folderId);
  const gridOrder = [...newConfig.gridOrder];
  const insertIdx = oldIdx >= 0 ? Math.min(oldIdx, gridOrder.length) : gridOrder.length;
  gridOrder.splice(insertIdx, 0, { type: "folder", folderId: newFolderId });
  return {
    ...newConfig,
    folders: [...newConfig.folders, { id: newFolderId, name: folderName, appBundleIds: [bundleId] }],
    gridOrder,
  };
}

/**
 * Parse stored config string, with migration from v0 (uncategorizedAppIds) to v1 (gridOrder).
 */
export function parseConfig(raw: string | undefined): DrawerConfig {
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return DEFAULT_CONFIG;

    // Migrate from old format (uncategorizedAppIds → gridOrder)
    if (Array.isArray(parsed.uncategorizedAppIds) && !Array.isArray(parsed.gridOrder)) {
      const folders: typeof parsed.folders = parsed.folders ?? [];
      const gridOrder: GridEntry[] = [
        ...folders.map((f: { id: string }): GridEntry => ({ type: "folder", folderId: f.id })),
        ...parsed.uncategorizedAppIds.map((id: string): GridEntry => ({ type: "app", bundleId: id })),
      ];
      return { version: 1, folders, gridOrder };
    }

    if (parsed.version === 1 && Array.isArray(parsed.folders) && Array.isArray(parsed.gridOrder)) {
      return parsed as DrawerConfig;
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
