/**
 * Search History - Helium Browser Controller
 * @author Just_Me
 */

import { List, showToast, Toast, Action, ActionPanel, Icon, showHUD, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

interface HistoryItem {
  id: number;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: number;
  lastVisitDate: Date;
}

// Get LocalAppData path using multiple methods
function getLocalAppDataPathsForHelium(): string[] {
  const paths: string[] = [];

  if (process.env.LOCALAPPDATA) {
    paths.push(process.env.LOCALAPPDATA);
  }

  if (process.env.USERPROFILE) {
    const candidate = path.join(process.env.USERPROFILE, "AppData", "Local");
    if (!paths.includes(candidate)) paths.push(candidate);
  }

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      const candidate = path.join(homeDir, "AppData", "Local");
      if (!paths.includes(candidate)) paths.push(candidate);
    }
  } catch {
    // Ignore
  }

  return paths;
}

// Get all possible Helium installation paths
function getHeliumPaths(): string[] {
  const paths: string[] = [];
  const localAppDataPaths = getLocalAppDataPathsForHelium();

  const homeDir = os.homedir();
  if (homeDir) {
    paths.push(path.join(homeDir, "AppData", "Local", "imput", "Helium", "Application", "chrome.exe"));
  }

  for (const localAppData of localAppDataPaths) {
    paths.push(path.join(localAppData, "imput", "Helium", "Application", "chrome.exe"));
    paths.push(path.join(localAppData, "imput", "Helium", "Helium.exe"));
    paths.push(path.join(localAppData, "Programs", "Helium", "Helium.exe"));
    paths.push(path.join(localAppData, "Helium", "Helium.exe"));
  }

  if (process.env.PROGRAMFILES) {
    paths.push(path.join(process.env.PROGRAMFILES, "Helium", "Helium.exe"));
  }
  if (process.env["PROGRAMFILES(X86)"]) {
    paths.push(path.join(process.env["PROGRAMFILES(X86)"], "Helium", "Helium.exe"));
  }

  return paths;
}

// Find Helium executable
async function findHeliumPath(): Promise<string | null> {
  for (const p of getHeliumPaths()) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    const { stdout } = await execAsync(
      `powershell -Command "Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Helium.exe' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty '(default)'"`,
    );
    const registryPath = stdout.trim();
    if (registryPath && fs.existsSync(registryPath)) {
      return registryPath;
    }
  } catch {
    // Ignore
  }

  try {
    const { stdout } = await execAsync(`where Helium.exe`);
    const wherePath = stdout.trim().split("\n")[0];
    if (wherePath && fs.existsSync(wherePath)) {
      return wherePath;
    }
  } catch {
    // Ignore
  }

  return null;
}

function getLocalAppDataPaths(): string[] {
  const paths: string[] = [];

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData && localAppData.trim()) {
    paths.push(localAppData);
  }

  const userProfile = process.env.USERPROFILE;
  if (userProfile && userProfile.trim()) {
    const candidate = path.join(userProfile, "AppData", "Local");
    if (!paths.includes(candidate)) {
      paths.push(candidate);
    }
  }

  try {
    const homeDir = os.homedir();
    if (homeDir) {
      const candidate = path.join(homeDir, "AppData", "Local");
      if (!paths.includes(candidate)) {
        paths.push(candidate);
      }
    }
  } catch {
    // Ignore errors
  }

  return paths;
}

function findHistoryDatabase(): string | null {
  const localAppDataPaths = getLocalAppDataPaths();
  const possiblePaths: string[] = [];

  for (const localAppData of localAppDataPaths) {
    const possibleRoots = [
      path.join(localAppData, "imput", "Helium", "User Data"),
      path.join(localAppData, "Helium", "User Data"),
    ];

    for (const root of possibleRoots) {
      possiblePaths.push(path.join(root, "Default", "History"));
      possiblePaths.push(path.join(root, "Profile 1", "History"));
      possiblePaths.push(path.join(root, "Profile 2", "History"));
    }
  }

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }

  return null;
}

function getHistoryDbCandidates(): string[] {
  const localAppDataPaths = getLocalAppDataPaths();
  const possiblePaths: string[] = [];

  for (const localAppData of localAppDataPaths) {
    const possibleRoots = [
      path.join(localAppData, "imput", "Helium", "User Data"),
      path.join(localAppData, "Helium", "User Data"),
    ];

    for (const root of possibleRoots) {
      possiblePaths.push(path.join(root, "Default", "History"));
      possiblePaths.push(path.join(root, "Profile 1", "History"));
      possiblePaths.push(path.join(root, "Profile 2", "History"));
    }
  }
  return possiblePaths;
}

function convertChromiumTimestamp(timestamp: number): Date {
  const unixTimestamp = timestamp / 1000000 - 11644473600;
  return new Date(unixTimestamp * 1000);
}

function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

function getThumbnailUrl(url: string): string {
  try {
    return `https://image.thum.io/get/width/600/${url}`;
  } catch {
    return "";
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

let cachedHistory: HistoryItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000;

function clearHistoryCache() {
  cachedHistory = null;
  cacheTimestamp = 0;
}

function getSqlite3Path(): string {
  console.log("__dirname:", __dirname);
  console.log("process.cwd():", process.cwd());

  // Try every possible combination
  const possiblePaths = [
    path.join(__dirname, "..", "assets", "sqlite3.exe"),
    path.join(__dirname, "..", "bin", "sqlite3.exe"),
    path.join(__dirname, "assets", "sqlite3.exe"),
    path.join(__dirname, "bin", "sqlite3.exe"),
    path.join(__dirname, "..", "..", "assets", "sqlite3.exe"),
    path.join(__dirname, "..", "..", "bin", "sqlite3.exe"),
    path.join(process.cwd(), "assets", "sqlite3.exe"),
    path.join(process.cwd(), "bin", "sqlite3.exe"),
    path.resolve("assets", "sqlite3.exe"),
    path.resolve("bin", "sqlite3.exe"),
  ];

  for (const p of possiblePaths) {
    console.log("Trying path:", p);
    console.log("Exists:", fs.existsSync(p));
    if (fs.existsSync(p)) {
      console.log("Found sqlite3 at:", p);
      return p;
    }
  }

  // As a fallback, try to find sqlite3.exe in PATH
  try {
    const whereOutput = execSync("where sqlite3.exe", { encoding: "utf-8" }).trim();
    if (whereOutput) {
      const sqlitePath = whereOutput.split("\n")[0].trim();
      if (fs.existsSync(sqlitePath)) {
        return sqlitePath;
      }
    }
  } catch {
    // Ignore PATH search failure
  }

  throw new Error(`sqlite3.exe not found. Please ensure sqlite3.exe is in the assets or bin folder.`);
}

function loadHistoryFromDb(): HistoryItem[] {
  const dbPath = findHistoryDatabase();
  if (!dbPath) {
    return [];
  }

  try {
    const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();
    const tempDbPath = path.join(tempDir, `helium_history_${Date.now()}.db`);

    fs.copyFileSync(dbPath, tempDbPath);

    const sqlite3Path = getSqlite3Path();
    let result: HistoryItem[] = [];

    try {
      const query =
        "SELECT id, url, title, visit_count, last_visit_time FROM urls ORDER BY last_visit_time DESC LIMIT 500;";

      const escapedSqlitePath = sqlite3Path.replace(/"/g, '""');
      const escapedDbPath = tempDbPath.replace(/"/g, '""');
      const escapedQuery = query.replace(/"/g, '""');

      const command = `"${escapedSqlitePath}" -json "${escapedDbPath}" "${escapedQuery}"`;

      const output = execSync(command, {
        encoding: "utf-8",
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const rows = JSON.parse(output || "[]") as Array<{
        id: number;
        url: string;
        title: string;
        visit_count: number;
        last_visit_time: number;
      }>;
      result = rows.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title || row.url,
        visitCount: row.visit_count,
        lastVisitTime: row.last_visit_time,
        lastVisitDate: convertChromiumTimestamp(row.last_visit_time),
      }));
    } catch (sqliteError: unknown) {
      const errMsg = sqliteError instanceof Error ? sqliteError.message : String(sqliteError);
      throw new Error(`Failed to query history database: ${errMsg}`);
    }

    try {
      fs.unlinkSync(tempDbPath);
    } catch {
      // Ignore cleanup errors
    }

    return result;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("database is locked")) {
      throw new Error("Database is locked. Please close Helium browser and try again.");
    }
    throw error;
  }
}

function loadHistory(searchQuery: string = ""): HistoryItem[] {
  const now = Date.now();
  if (!cachedHistory || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedHistory = loadHistoryFromDb();
    cacheTimestamp = now;
  }

  if (!searchQuery.trim()) {
    return cachedHistory.slice(0, 500);
  }

  const query = searchQuery.toLowerCase();
  return cachedHistory
    .filter((item) => item.title.toLowerCase().includes(query) || item.url.toLowerCase().includes(query))
    .slice(0, 500);
}

async function deleteHistoryEntry(entryId: number): Promise<boolean> {
  const dbPath = findHistoryDatabase();
  if (!dbPath) {
    throw new Error("History database not found");
  }

  const sqlite3Path = getSqlite3Path();
  const escapedSqlitePath = sqlite3Path.replace(/"/g, '""');
  const tempDir = process.env.TEMP || process.env.TMP || os.tmpdir();

  // Strategy 1: Try direct deletion with WAL mode and transaction (works if browser isn't actively writing)
  try {
    const deleteQuery = `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000; BEGIN IMMEDIATE TRANSACTION; DELETE FROM urls WHERE id = ${entryId}; DELETE FROM visits WHERE url = ${entryId}; COMMIT;`;
    const escapedDbPath = dbPath.replace(/"/g, '""');
    const escapedQuery = deleteQuery.replace(/"/g, '""');
    const command = `"${escapedSqlitePath}" "${escapedDbPath}" "${escapedQuery}"`;

    execSync(command, { encoding: "utf-8", timeout: 20000 });
    clearHistoryCache();
    return true;
  } catch {
    // Strategy 1 failed, try strategy 2
  }

  // Strategy 2: Copy database, modify copy, replace original
  const tempDbPath = path.join(tempDir, `helium_history_delete_${Date.now()}.db`);

  try {
    // Try to copy the database (with retries for locked file)
    let copied = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fs.copyFileSync(dbPath, tempDbPath);
        copied = true;
        break;
      } catch {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    if (!copied) {
      throw new Error("Could not access database file");
    }

    // Delete from the temp copy with transaction for atomicity
    const deleteQuery = `BEGIN IMMEDIATE TRANSACTION; DELETE FROM urls WHERE id = ${entryId}; DELETE FROM visits WHERE url = ${entryId}; COMMIT;`;
    const escapedTempDbPath = tempDbPath.replace(/"/g, '""');
    const escapedQuery = deleteQuery.replace(/"/g, '""');
    const command = `"${escapedSqlitePath}" "${escapedTempDbPath}" "${escapedQuery}"`;

    execSync(command, { encoding: "utf-8", timeout: 15000 });

    // Try to replace original file (with retries)
    let replaced = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.copyFileSync(tempDbPath, dbPath);
        replaced = true;
        break;
      } catch {
        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }

    // Clean up temp file
    try {
      fs.unlinkSync(tempDbPath);
    } catch {
      // Ignore cleanup errors
    }

    if (!replaced) {
      throw new Error("Database is locked. Close Helium browser and try again.");
    }

    clearHistoryCache();
    return true;
  } catch (error: unknown) {
    // Clean up temp file on error
    try {
      fs.unlinkSync(tempDbPath);
    } catch {
      // Ignore
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("locked") || errorMsg.includes("EBUSY") || errorMsg.includes("Could not access")) {
      throw new Error("Database is locked. Close Helium browser and try again.");
    }
    throw new Error(`Delete failed: ${errorMsg}`);
  }
}

async function launchURL(url: string): Promise<boolean> {
  const heliumPath = await findHeliumPath();
  if (!heliumPath) {
    return false;
  }

  try {
    const escapedPath = heliumPath.replace(/'/g, "''").replace(/"/g, '\\"');
    const escapedUrl = url.replace(/'/g, "''").replace(/"/g, '\\"');

    await execAsync(
      `powershell -Command "Start-Process -FilePath '${escapedPath}' -ArgumentList '${escapedUrl}' -ErrorAction Stop"`,
    );
    return true;
  } catch {
    try {
      await execAsync(`cmd /c start "" "${heliumPath}" "${url}"`);
      return true;
    } catch {
      return false;
    }
  }
}

export default function Command() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);
      const items = loadHistory(searchText);
      setHistoryItems(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      setHistoryItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchText]);

  const handleOpenURL = async (url: string) => {
    const success = await launchURL(url);
    if (success) {
      await showHUD("Opening URL...");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open URL",
        message: "Could not launch Helium browser",
      });
    }
  };

  const toggleSelection = useCallback((itemId: number) => {
    setSelectedItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteEntry = async (item: HistoryItem) => {
    const confirmed = await confirmAlert({
      title: "Delete History Entry",
      message: `Are you sure you want to delete "${item.title}" from your history?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteHistoryEntry(item.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Entry deleted",
        message: "History entry has been removed",
      });
      clearHistoryCache();

      try {
        setIsLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const items = loadHistory(searchText);
        setHistoryItems(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reload history");
        setHistoryItems([]);
      } finally {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete entry";
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg,
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select items to delete",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Selected Entries",
      message: `Are you sure you want to delete ${selectedItems.size} history entr${selectedItems.size === 1 ? "y" : "ies"}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const itemId of selectedItems) {
        try {
          await deleteHistoryEntry(itemId);
          successCount++;
        } catch {
          failCount++;
        }
      }

      setSelectedItems(new Set());
      setIsSelectionMode(false);
      clearHistoryCache();

      if (successCount > 0) {
        const failMessage = failCount > 0 ? ` (${failCount} failed)` : "";
        await showToast({
          style: failCount > 0 ? Toast.Style.Animated : Toast.Style.Success,
          title: "Entries deleted",
          message: `Deleted ${successCount} entr${successCount === 1 ? "y" : "ies"}${failMessage}`,
        });
      } else if (failCount > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete failed",
          message: `All ${failCount} entries failed to delete. Close browser and try again.`,
        });
      }

      try {
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const items = loadHistory(searchText);
        setHistoryItems(items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to reload history");
        setHistoryItems([]);
      } finally {
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete entries";
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message: errorMsg,
      });
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Error Loading History" description={error} />
      </List>
    );
  }

  const dbPath = findHistoryDatabase();
  if (!dbPath && !isLoading) {
    const candidates = getHistoryDbCandidates();
    const localPaths = getLocalAppDataPaths();
    const debugInfo = [
      `LocalAppData paths found: ${localPaths.length}`,
      localPaths.length > 0 ? localPaths[0] : "(none)",
      "",
      "Tried DB paths:",
      ...candidates.slice(0, 3),
    ].join("\n");
    return (
      <List>
        <List.EmptyView icon={Icon.Binoculars} title="History Database Not Found" description={debugInfo} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        isSelectionMode ? `Select items (${selectedItems.size} selected)` : "Search browser history..."
      }
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={!isSelectionMode}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Selection Mode"
          value={isSelectionMode ? "selection" : "normal"}
          onChange={(value) => {
            setIsSelectionMode(value === "selection");
            if (value !== "selection") {
              setSelectedItems(new Set());
            }
          }}
        >
          <List.Dropdown.Item title="Normal Mode" value="normal" />
          <List.Dropdown.Item title="Selection Mode" value="selection" />
        </List.Dropdown>
      }
    >
      {historyItems.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Binoculars}
          title="No History Found"
          description={searchText ? "Try a different search term" : "No browser history available"}
        />
      ) : (
        historyItems.map((item) => {
          const domain = getDomain(item.url);
          const favicon = getFaviconUrl(item.url);
          const thumbnail = getThumbnailUrl(item.url);
          const isSelected = selectedItems.has(item.id);

          return (
            <List.Item
              key={item.id}
              title={isSelectionMode && isSelected ? `✓ ${item.title}` : item.title}
              icon={{ source: favicon, fallback: Icon.Globe }}
              accessories={[
                { text: formatDate(item.lastVisitDate) },
                ...(isSelectionMode && isSelected ? [{ icon: Icon.Checkmark, tooltip: "Selected" }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`![Website Preview](${thumbnail})\n\n## ${item.title}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="URL"
                        target={item.url}
                        text={item.url.length > 50 ? item.url.substring(0, 50) + "..." : item.url}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Domain"
                        text={domain}
                        icon={{ source: favicon, fallback: Icon.Globe }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Visit Count"
                        text={`${item.visitCount} visit${item.visitCount !== 1 ? "s" : ""}`}
                        icon={Icon.Eye}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Last Visited"
                        text={item.lastVisitDate.toLocaleString()}
                        icon={Icon.Clock}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Relative Time"
                        text={formatDate(item.lastVisitDate)}
                        icon={Icon.Calendar}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {isSelectionMode ? (
                    <>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.Checkmark}
                        onAction={() => {
                          toggleSelection(item.id);
                        }}
                        shortcut={{ modifiers: ["ctrl"], key: "s" }}
                      />
                      {selectedItems.size > 0 && (
                        <Action
                          title={`Delete ${selectedItems.size} Selected`}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={handleBulkDelete}
                          shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                        />
                      )}
                      <Action
                        title="Exit Selection Mode"
                        icon={Icon.XMarkCircle}
                        onAction={() => {
                          setIsSelectionMode(false);
                          setSelectedItems(new Set());
                        }}
                        shortcut={{ modifiers: [], key: "escape" }}
                      />
                    </>
                  ) : (
                    <>
                      <Action title="Open in Helium" icon={Icon.Globe} onAction={() => handleOpenURL(item.url)} />
                      <Action
                        title="Delete Entry"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteEntry(item)}
                        shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                      />
                      <Action
                        title="Select Multiple"
                        icon={Icon.Checkmark}
                        onAction={() => {
                          setIsSelectionMode(true);
                          toggleSelection(item.id);
                        }}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={item.url}
                        shortcut={{ modifiers: ["ctrl"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Title"
                        content={item.title}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                      />
                      <Action.OpenInBrowser title="Open in Default Browser" url={item.url} />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
