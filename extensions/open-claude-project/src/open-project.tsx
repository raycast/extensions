import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// Constants
// ============================================================================

const BUFFER_SIZE = 4096;
const MAX_SESSION_FILES_TO_CHECK = 3;
const MAX_LINES_TO_CHECK = 10;
const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const DAYS_IN_WEEK = 7;

// ============================================================================
// i18n - Internationalization
// ============================================================================

const i18n = {
  zh: {
    // Time
    justNow: "刚刚",
    minutesAgo: (n: number) => `${n} 分钟前`,
    hoursAgo: (n: number) => `${n} 小时前`,
    daysAgo: (n: number) => `${n} 天前`,
    // Groups
    favorites: "收藏",
    today: "今天",
    thisWeek: "本周",
    earlier: "更早",
    // Sessions
    sessions: (n: number) => `${n} 个会话`,
    projects: (n: number) => `${n} 个项目`,
    // Actions
    continueSession: "继续上次会话",
    newSession: "新建会话",
    addFavorite: "收藏项目",
    removeFavorite: "取消收藏",
    showInFinder: "在 Finder 中显示",
    copyPath: "复制路径",
    refresh: "刷新列表",
    openPreferences: "打开偏好设置",
    // Section titles
    sectionOpen: "打开",
    sectionManage: "管理",
    // Toast messages
    openedInTerminal: "已在终端中打开",
    openTerminalFailed: "打开终端失败",
    copiedToClipboard: "命令已复制到剪贴板",
    pasteInAlacritty: "请在 Alacritty 中粘贴执行",
    openedInKitty: "已在 Kitty 中打开",
    favorited: "已收藏",
    unfavorited: "已取消收藏",
    loadFailed: "加载项目失败",
    unknownError: "未知错误",
    // Empty view
    noProjects: "未找到 Claude Code 项目",
    noProjectsDesc: "开始使用 Claude Code 后项目会显示在这里",
    // Search
    searchPlaceholder: "搜索 Claude Code 项目...",
  },
  en: {
    // Time
    justNow: "Just now",
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n} hour${n > 1 ? "s" : ""} ago`,
    daysAgo: (n: number) => `${n} day${n > 1 ? "s" : ""} ago`,
    // Groups
    favorites: "Favorites",
    today: "Today",
    thisWeek: "This Week",
    earlier: "Earlier",
    // Sessions
    sessions: (n: number) => `${n} session${n > 1 ? "s" : ""}`,
    projects: (n: number) => `${n} project${n > 1 ? "s" : ""}`,
    // Actions
    continueSession: "Continue Last Session",
    newSession: "New Session",
    addFavorite: "Add to Favorites",
    removeFavorite: "Remove from Favorites",
    showInFinder: "Show in Finder",
    copyPath: "Copy Path",
    refresh: "Refresh",
    openPreferences: "Open Preferences",
    // Section titles
    sectionOpen: "Open",
    sectionManage: "Manage",
    // Toast messages
    openedInTerminal: "Opened in Terminal",
    openTerminalFailed: "Failed to open terminal",
    copiedToClipboard: "Command copied to clipboard",
    pasteInAlacritty: "Paste in Alacritty to execute",
    openedInKitty: "Opened in Kitty",
    favorited: "Added to favorites",
    unfavorited: "Removed from favorites",
    loadFailed: "Failed to load projects",
    unknownError: "Unknown error",
    // Empty view
    noProjects: "No Claude Code Projects Found",
    noProjectsDesc: "Projects will appear here after using Claude Code",
    // Search
    searchPlaceholder: "Search Claude Code projects...",
  },
};

type Language = keyof typeof i18n;
type I18nStrings = typeof i18n.zh;

// ============================================================================
// Types
// ============================================================================

interface Preferences {
  terminal: "iterm" | "terminal" | "warp" | "alacritty" | "kitty";
  groupByTime: boolean;
  showFavoritesFirst: boolean;
  language: Language;
}

interface ClaudeProject {
  name: string;
  fullPath: string;
  encodedName: string;
  lastModified: Date;
  sessionCount: number;
}

type TimeGroup = "favorites" | "today" | "thisWeek" | "earlier";

// ============================================================================
// Data Loading Functions
// ============================================================================

function readCwdFromSessionFile(filePath: string): string | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(BUFFER_SIZE);
    const bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE, 0);
    const content = buffer.toString("utf-8", 0, bytesRead);
    const lines = content.split("\n").slice(0, MAX_LINES_TO_CHECK);

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.cwd && typeof json.cwd === "string") {
          return json.cwd;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }
  } catch {
    // File read error
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
  return null;
}

interface ProjectPathResult {
  path: string | null;
  sessionFiles: string[];
}

function getProjectPathAndFiles(
  projectDir: string,
  encodedName: string,
): ProjectPathResult {
  let files: string[];
  try {
    files = fs
      .readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"));
  } catch {
    return { path: null, sessionFiles: [] };
  }

  if (files.length === 0) {
    const decodedPath = "/" + encodedName.replace(/-/g, "/");
    if (fs.existsSync(decodedPath)) {
      return { path: decodedPath, sessionFiles: [] };
    }
    return { path: null, sessionFiles: [] };
  }

  const sortedFiles = files
    .map((f) => {
      try {
        return { name: f, mtime: fs.statSync(path.join(projectDir, f)).mtime };
      } catch {
        return null;
      }
    })
    .filter((f): f is { name: string; mtime: Date } => f !== null)
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  for (const file of sortedFiles.slice(0, MAX_SESSION_FILES_TO_CHECK)) {
    const cwd = readCwdFromSessionFile(path.join(projectDir, file.name));
    if (cwd && fs.existsSync(cwd)) {
      return { path: cwd, sessionFiles: files };
    }
  }

  const decodedPath = "/" + encodedName.replace(/-/g, "/");
  if (fs.existsSync(decodedPath)) {
    return { path: decodedPath, sessionFiles: files };
  }

  return { path: null, sessionFiles: files };
}

async function loadClaudeProjects(): Promise<ClaudeProject[]> {
  const claudeProjectsDir = path.join(os.homedir(), ".claude", "projects");

  if (!fs.existsSync(claudeProjectsDir)) {
    return [];
  }

  const entries = fs.readdirSync(claudeProjectsDir, { withFileTypes: true });
  const projects: ClaudeProject[] = [];
  const seenPaths = new Set<string>();

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    const projectDir = path.join(claudeProjectsDir, entry.name);
    const { path: fullPath, sessionFiles } = getProjectPathAndFiles(
      projectDir,
      entry.name,
    );

    if (!fullPath || seenPaths.has(fullPath)) {
      continue;
    }

    seenPaths.add(fullPath);

    let stats: fs.Stats;
    try {
      stats = fs.statSync(projectDir);
    } catch {
      continue;
    }

    projects.push({
      name: path.basename(fullPath),
      fullPath,
      encodedName: entry.name,
      lastModified: stats.mtime,
      sessionCount: sessionFiles.length,
    });
  }

  return projects.sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
  );
}

// ============================================================================
// Time & Grouping Utilities
// ============================================================================

function formatRelativeTime(date: Date, t: I18nStrings): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return t.minutesAgo(diffMins);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  if (diffDays < DAYS_IN_WEEK) return t.daysAgo(diffDays);
  return date.toLocaleDateString();
}

function getTimeGroup(date: Date): TimeGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - DAYS_IN_WEEK * MS_PER_DAY);

  if (date >= today) return "today";
  if (date >= weekAgo) return "thisWeek";
  return "earlier";
}

function getGroupTitle(group: TimeGroup, t: I18nStrings): string {
  switch (group) {
    case "favorites":
      return t.favorites;
    case "today":
      return t.today;
    case "thisWeek":
      return t.thisWeek;
    case "earlier":
      return t.earlier;
  }
}

// ============================================================================
// Terminal Opening Functions
// ============================================================================

function getITermScript(cmd: string): string {
  return `
tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "${cmd}"
  end tell
end tell`;
}

// Escape string for AppleScript double-quoted strings
function escapeForAppleScript(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function openInTerminal(
  projectPath: string,
  continueSession: boolean,
  terminal: string,
  t: I18nStrings,
) {
  const claudeCmd = continueSession ? "claude -c" : "claude";
  // Use single quotes for shell (only need to escape single quotes)
  const shellSafePath = projectPath.replace(/'/g, `'"'"'`);
  const fullCmd = `cd '${shellSafePath}' && ${claudeCmd}`;
  // Escape entire command for AppleScript embedding
  const appleScriptCmd = escapeForAppleScript(fullCmd);

  let script: string;

  switch (terminal) {
    case "iterm":
      script = getITermScript(appleScriptCmd);
      break;

    case "terminal":
      script = `
tell application "Terminal"
  activate
  do script "${appleScriptCmd}"
end tell`;
      break;

    case "warp":
      script = `
tell application "Warp"
  activate
end tell
delay 0.5
tell application "System Events"
  keystroke "t" using command down
  delay 0.3
  keystroke "${appleScriptCmd}"
  keystroke return
end tell`;
      break;

    case "alacritty":
      spawnSync("open", ["-a", "Alacritty"]);
      spawnSync("bash", ["-c", `echo '${fullCmd}' | pbcopy`]);
      showToast({
        style: Toast.Style.Success,
        title: t.copiedToClipboard,
        message: t.pasteInAlacritty,
      });
      return;

    case "kitty":
      spawnSync("kitty", [
        "--single-instance",
        "--directory",
        projectPath,
        "bash",
        "-c",
        claudeCmd,
      ]);
      showToast({
        style: Toast.Style.Success,
        title: t.openedInKitty,
        message: path.basename(projectPath),
      });
      return;

    default:
      script = getITermScript(fullCmd);
  }

  const result = spawnSync("osascript", ["-e", script], { encoding: "utf-8" });

  if (result.status === 0) {
    showToast({
      style: Toast.Style.Success,
      title: t.openedInTerminal,
      message: path.basename(projectPath),
    });
  } else {
    const errorMsg =
      result.stderr?.trim() || result.error?.message || t.unknownError;
    showToast({
      style: Toast.Style.Failure,
      title: t.openTerminalFailed,
      message: errorMsg,
    });
  }
}

function showInFinder(projectPath: string) {
  spawnSync("open", ["-R", projectPath]);
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

function getQuickShortcut(idx: number) {
  if (idx === 0) return { modifiers: ["cmd"] as ["cmd"], key: "1" as const };
  if (idx === 1) return { modifiers: ["cmd"] as ["cmd"], key: "2" as const };
  if (idx === 2) return { modifiers: ["cmd"] as ["cmd"], key: "3" as const };
  return undefined;
}

// ============================================================================
// Main Component
// ============================================================================

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const t = i18n[preferences.language] || i18n.en;
  const { value: favorites = [], setValue: setFavorites } = useLocalStorage<
    string[]
  >("favorites", []);

  const {
    data: projects = [],
    isLoading,
    revalidate,
  } = useCachedPromise(loadClaudeProjects, [], {
    keepPreviousData: true,
  });

  const isFavorite = (project: ClaudeProject) =>
    favorites.includes(project.fullPath);

  const toggleFavorite = async (project: ClaudeProject) => {
    const wasFavorite = isFavorite(project);
    const newFavorites = wasFavorite
      ? favorites.filter((p) => p !== project.fullPath)
      : [...favorites, project.fullPath];
    await setFavorites(newFavorites);
    showToast({
      style: Toast.Style.Success,
      title: wasFavorite ? t.unfavorited : t.favorited,
      message: project.name,
    });
  };

  // Sort and group projects
  const sortedProjects = [...projects].sort((a, b) => {
    if (preferences.showFavoritesFirst) {
      const aFav = isFavorite(a);
      const bFav = isFavorite(b);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
    }
    return b.lastModified.getTime() - a.lastModified.getTime();
  });

  // Group projects by time
  const groupedProjects = new Map<TimeGroup, ClaudeProject[]>();

  if (preferences.groupByTime) {
    for (const project of sortedProjects) {
      const group =
        preferences.showFavoritesFirst && isFavorite(project)
          ? "favorites"
          : getTimeGroup(project.lastModified);
      const existing = groupedProjects.get(group) || [];
      groupedProjects.set(group, [...existing, project]);
    }
  }

  const renderProjectItem = (project: ClaudeProject, index: number) => {
    const favorite = isFavorite(project);
    const quickShortcut = getQuickShortcut(index);

    return (
      <List.Item
        key={project.encodedName}
        title={project.name}
        subtitle={project.fullPath}
        icon={{
          source: favorite ? Icon.StarCircle : Icon.Terminal,
          tintColor: favorite ? Color.Yellow : Color.Orange,
        }}
        accessories={[
          { text: t.sessions(project.sessionCount), icon: Icon.Document },
          {
            text: formatRelativeTime(project.lastModified, t),
            icon: Icon.Clock,
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section title={t.sectionOpen}>
              <Action
                title={t.continueSession}
                icon={Icon.ArrowRight}
                shortcut={quickShortcut}
                onAction={() =>
                  openInTerminal(
                    project.fullPath,
                    true,
                    preferences.terminal,
                    t,
                  )
                }
              />
              <Action
                title={t.newSession}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  openInTerminal(
                    project.fullPath,
                    false,
                    preferences.terminal,
                    t,
                  )
                }
              />
            </ActionPanel.Section>
            <ActionPanel.Section title={t.sectionManage}>
              <Action
                title={favorite ? t.removeFavorite : t.addFavorite}
                icon={favorite ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => toggleFavorite(project)}
              />
              <Action
                title={t.showInFinder}
                icon={Icon.Finder}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => showInFinder(project.fullPath)}
              />
              <Action.OpenWith
                path={project.fullPath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.CopyToClipboard
                title={t.copyPath}
                content={project.fullPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title={t.refresh}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              <Action
                title={t.openPreferences}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t.searchPlaceholder}>
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title={t.noProjects}
          description={t.noProjectsDesc}
          icon={Icon.Terminal}
        />
      ) : preferences.groupByTime ? (
        // Grouped view
        (["favorites", "today", "thisWeek", "earlier"] as TimeGroup[]).map(
          (group) => {
            const groupProjects = groupedProjects.get(group);
            if (!groupProjects || groupProjects.length === 0) return null;
            return (
              <List.Section
                key={group}
                title={getGroupTitle(group, t)}
                subtitle={t.projects(groupProjects.length)}
              >
                {groupProjects.map((project) =>
                  renderProjectItem(project, sortedProjects.indexOf(project)),
                )}
              </List.Section>
            );
          },
        )
      ) : (
        // Flat view
        sortedProjects.map((project, index) =>
          renderProjectItem(project, index),
        )
      )}
    </List>
  );
}
