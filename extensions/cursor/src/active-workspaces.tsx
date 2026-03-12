import { Action, ActionPanel, closeMainWindow, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { basename } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

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

function tildify(filePath: string): string {
  const home = homedir();
  return filePath.startsWith(home) ? filePath.replace(home, "~") : filePath;
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
        perform action "AXRaise" of (first window whose name is "${escaped}")
      end tell
    end tell
  `;
}

function getActiveWindowsScript(): string {
  return `
    tell application "System Events"
      if exists process "Cursor" then
        tell process "Cursor"
          set windowNames to name of every window
          set output to ""
          repeat with wName in windowNames
            set output to output & wName & linefeed
          end repeat
          return output
        end tell
      else
        return ""
      end if
    end tell
  `;
}

async function getGitBranch(directoryPath: string): Promise<string | null> {
  try {
    const gitDir = path.join(directoryPath, ".git");
    await fs.promises.access(gitDir);
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: directoryPath,
      encoding: "utf-8",
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function getRecentEntriesMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    if (!fs.existsSync(DB_PATH)) return map;
    const { stdout } = await execFileAsync("sqlite3", [DB_PATH, RECENT_ENTRIES_QUERY]);
    if (!stdout.trim()) return map;
    const entries = JSON.parse(stdout.trim());
    for (const entry of entries) {
      const uri = entry.folderUri || entry.workspace?.configPath;
      if (uri && uri.startsWith("file://")) {
        const fsPath = fileURLToPath(uri);
        const name = basename(fsPath);
        if (!map.has(name)) {
          map.set(name, fsPath);
        }
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
          const resolvedPath = recentEntries.get(win.workspaceName) ?? null;
          const gitBranch = resolvedPath ? await getGitBranch(resolvedPath) : null;
          return { ...win, workspacePath: resolvedPath, gitBranch };
        }),
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
        if (window.gitBranch) {
          accessories.push({
            tag: { value: window.gitBranch, color: Color.Green },
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
