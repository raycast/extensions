import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { basename } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import tildify from "tildify";
import * as fs from "fs";
import * as path from "path";
import { execFilePromise } from "./utils/exec";
import { showGitBranch, gitBranchColor } from "./preferences";
import { isValidHexColor } from "./utils";

const DB_PATH = `${homedir()}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const RECENT_ENTRIES_QUERY =
  "SELECT json_extract(value, '$.entries') as entries FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'";

interface CursorWindow {
  rawTitle: string;
  fileName: string;
  workspaceName: string;
  workspacePath: string | null;
  gitBranch: string | null;
}

function stripAppSuffix(title: string): string {
  return title.replace(/ — Cursor$/, "");
}

function parseWindowTitle(rawTitle: string): CursorWindow {
  const displayTitle = stripAppSuffix(rawTitle);
  const parts = displayTitle.split(" — ");
  if (parts.length >= 2) {
    return {
      rawTitle,
      fileName: parts[0].trim(),
      workspaceName: parts.slice(1).join(" — ").trim(),
      workspacePath: null,
      gitBranch: null,
    };
  }
  return {
    rawTitle,
    fileName: "",
    workspaceName: displayTitle.trim(),
    workspacePath: null,
    gitBranch: null,
  };
}

function buildFocusScript(windowTitle: string): string {
  const escaped = windowTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `
    tell application "Cursor" to activate
    tell application "System Events"
      tell process "Cursor"
        set frontmost to true
        -- Selecting the native Window menu entry switches to its Space as well.
        click (first menu item of menu 1 of menu bar item "Window" of menu bar 1 whose name is "${escaped}" and value of attribute "AXIdentifier" is "makeKeyAndOrderFront:")
      end tell
    end tell
  `;
}

function getActiveWindowsScript(): string {
  return `
    tell application "System Events"
      if exists process "Cursor" then
        tell process "Cursor"
          -- Cursor's Window menu lists user-facing windows across all Spaces;
          -- its AXWindows list omits other Spaces. Core Graphics is faster but
          -- needs a native bridge and can require Screen Recording access for titles.
          set windowMenu to menu 1 of menu bar item "Window" of menu bar 1
          -- Batch reads avoid an Apple Event round trip for each menu item.
          -- The attribute filter yields an empty list for items without an ID.
          set windowNames to name of every menu item of windowMenu
          set identifiers to value of (every attribute of every menu item of windowMenu whose name is "AXIdentifier")
        end tell
      else
        return ""
      end if
    end tell
    -- Filter the fetched values locally, outside the System Events tell block.
    set output to ""
    repeat with i from 1 to count windowNames
      if item i of identifiers contains "makeKeyAndOrderFront:" then
        set output to output & item i of windowNames & linefeed
      end if
    end repeat
    return output
  `;
}

async function getGitBranch(directoryPath: string): Promise<string | null> {
  try {
    const gitDir = path.join(directoryPath, ".git");
    await fs.promises.access(gitDir);
    const { stdout } = await execFilePromise("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directoryPath,
      encoding: "utf-8",
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function getRecentEntriesMap(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    if (!fs.existsSync(DB_PATH)) return map;
    const { stdout } = await execFilePromise("sqlite3", [DB_PATH, RECENT_ENTRIES_QUERY]);
    if (!stdout.trim()) return map;
    const entries = JSON.parse(stdout.trim());
    for (const entry of entries) {
      const uri = entry.folderUri || entry.workspace?.configPath;
      if (uri && uri.startsWith("file://")) {
        const fsPath = fileURLToPath(uri);
        const name = basename(fsPath);
        const existing = map.get(name) ?? [];
        map.set(name, [...existing, fsPath]);
      }
    }
  } catch {
    console.log("Could not read recent entries from Cursor DB");
  }
  return map;
}

function useActiveWindows() {
  const [windows, setWindows] = useState<CursorWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWindows = async () => {
    setIsLoading(true);
    try {
      const [scriptResult, recentEntries] = await Promise.all([
        runAppleScript(getActiveWindowsScript()),
        getRecentEntriesMap(),
      ]);
      const titles = scriptResult
        .split("\n")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
      const parsed = titles.map(parseWindowTitle);
      const enriched = await Promise.all(
        parsed.map(async (win) => {
          const candidates = recentEntries.get(win.workspaceName) ?? [];
          const resolvedPath = candidates.length === 1 ? candidates[0] : null;
          const gitBranch = resolvedPath ? await getGitBranch(resolvedPath) : null;
          return { ...win, workspacePath: resolvedPath, gitBranch };
        })
      );
      setWindows(enriched);
    } catch (error) {
      await showToast({
        title: "Failed to get active workspaces",
        style: Toast.Style.Failure,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWindows();
  }, []);

  return { windows, isLoading, refresh: fetchWindows };
}

export default function ActiveWorkspaces() {
  const { windows, isLoading, refresh } = useActiveWindows();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search active workspaces...">
      <List.EmptyView title="No Active Workspaces" description="Open a Cursor window to see it listed here." />
      {windows.map((window, index) => {
        const accessories: List.Item.Accessory[] = [];
        if (window.fileName) {
          accessories.push({ text: window.fileName, tooltip: `Open file: ${window.fileName}` });
        }
        if (showGitBranch && window.gitBranch) {
          const color =
            gitBranchColor && isValidHexColor(gitBranchColor)
              ? { light: gitBranchColor, dark: gitBranchColor, adjustContrast: false }
              : Color.Green;
          accessories.push({
            tag: { value: window.gitBranch, color },
            tooltip: `Branch: ${window.gitBranch}`,
          });
        }
        const subtitle = window.workspacePath ? tildify(window.workspacePath) : undefined;
        const icon = window.workspacePath ? { fileIcon: window.workspacePath } : "cursor-icon.png";
        return (
          <List.Item
            key={`${window.rawTitle}-${index}`}
            title={window.workspaceName}
            subtitle={subtitle}
            icon={icon}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Focus Window"
                  icon={Icon.Window}
                  onAction={async () => {
                    try {
                      await closeMainWindow();
                      await runAppleScript(buildFocusScript(window.rawTitle));
                    } catch (error) {
                      await showToast({
                        title: "Failed to focus window",
                        style: Toast.Style.Failure,
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }}
                />
                {window.workspacePath && <Action.ShowInFinder path={window.workspacePath} />}
                {window.workspacePath && (
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={window.workspacePath}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
