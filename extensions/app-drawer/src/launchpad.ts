import { execSync } from "child_process";
import { DrawerConfig, GridEntry } from "./types";
import { generateId } from "./utils";

function findLaunchpadDbPath(): string {
  const result = execSync(
    'find /private/var/folders -name "db" -path "*/com.apple.dock.launchpad/db/db" 2>/dev/null | head -1',
    { encoding: "utf-8", timeout: 5000 },
  ).trim();
  if (!result) {
    throw new Error("Launchpad database not found");
  }
  return result;
}

function queryDb(dbPath: string, sql: string): string[][] {
  const result = execSync(`sqlite3 -separator $'\\t' "${dbPath}" "${sql}"`, {
    encoding: "utf-8",
    timeout: 10000,
  }).trim();
  if (!result) return [];
  return result.split("\n").map((line) => line.split("\t"));
}

/**
 * Get the set of all bundleIds registered in Launchpad.
 */
export function getLaunchpadBundleIds(): Set<string> | null {
  try {
    const dbPath = findLaunchpadDbPath();
    const rows = queryDb(dbPath, "SELECT bundleid FROM apps WHERE bundleid IS NOT NULL AND bundleid != ''");
    return new Set(rows.map(([id]) => id));
  } catch {
    return null;
  }
}

/**
 * Import the Launchpad layout into a DrawerConfig with interleaved folder/app ordering.
 */
export function importFromLaunchpad(): DrawerConfig {
  const dbPath = findLaunchpadDbPath();

  // 1. Get ALL top-level items on pages under root (parent_id=1): both apps (type=4) and folders (type=2)
  //    This gives us the interleaved order.
  const topLevelRows = queryDb(
    dbPath,
    `SELECT i.type, i.rowid, COALESCE(a.bundleid, ''), COALESCE(g.title, '')
     FROM items i
     LEFT JOIN apps a ON a.item_id = i.rowid AND i.type = 4
     LEFT JOIN groups g ON g.item_id = i.rowid AND i.type = 2
     JOIN items page_item ON page_item.rowid = i.parent_id AND page_item.type = 3
     WHERE (i.type = 4 OR i.type = 2) AND page_item.parent_id = 1
     ORDER BY page_item.ordering, i.ordering`,
  );

  // 2. Get folder contents (apps inside folders)
  const folderContentRows = queryDb(
    dbPath,
    `SELECT folder_item.rowid as folder_rowid, a.bundleid
     FROM items app_item
     JOIN apps a ON a.item_id = app_item.rowid
     JOIN items page_in_folder ON page_in_folder.rowid = app_item.parent_id AND page_in_folder.type = 3
     JOIN items folder_item ON folder_item.rowid = page_in_folder.parent_id AND folder_item.type = 2
     WHERE app_item.type = 4
     ORDER BY folder_item.rowid, page_in_folder.ordering, app_item.ordering`,
  );

  // Group folder contents by folder rowid
  const folderContents = new Map<string, string[]>();
  for (const [folderRowid, bundleId] of folderContentRows) {
    if (!bundleId) continue;
    const list = folderContents.get(folderRowid) ?? [];
    if (!folderContents.has(folderRowid)) folderContents.set(folderRowid, list);
    list.push(bundleId);
  }

  // 3. Build DrawerConfig
  const folders: DrawerConfig["folders"] = [];
  const gridOrder: GridEntry[] = [];

  for (const [type, rowid, bundleId, folderName] of topLevelRows) {
    if (type === "4" && bundleId) {
      // App directly on page
      gridOrder.push({ type: "app", bundleId });
    } else if (type === "2" && folderName) {
      // Folder
      const id = generateId();
      const appBundleIds = folderContents.get(rowid) ?? [];
      folders.push({ id, name: folderName, appBundleIds });
      gridOrder.push({ type: "folder", folderId: id });
    }
  }

  return { version: 1, folders, gridOrder };
}
