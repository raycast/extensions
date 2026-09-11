import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { exec } from "child_process";
import { readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useEffect, useMemo, useState } from "react";
import { promisify } from "util";
import { isIt2apiAvailable, warnIt2apiMissing } from "./core/it2api";
import { getFocusedSessionId, sendText, splitPane } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

const execAsync = promisify(exec);

interface Project {
  name: string;
  path: string;
}

interface GitInfo {
  branch?: string;
  version?: string;
}

const expandPath = (p: string) => p.replace(/^~/, homedir());

const gitAsync = async (dir: string, cmd: string): Promise<string | undefined> => {
  try {
    const { stdout } = await execAsync(`git -C "${dir}" ${cmd} 2>/dev/null`, { timeout: 3000 });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
};

const getProjects = (dir: string): Project[] => {
  try {
    const expanded = expandPath(dir);
    return readdirSync(expanded, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => ({ name: d.name, path: join(expanded, d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
};

const escapeForAppleScript = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const makeNewTabScript = (path: string) => {
  const p = escapeForAppleScript(path);
  return `
    tell application "iTerm"
      launch
      repeat until application "iTerm" is running
        delay 0.1
      end repeat
      if windows of application "iTerm" is {} then
        set w to create window with default profile
      else
        set w to current window
        tell w to create tab with default profile
      end if
      tell current session of w
        write text "cd \\"${p}\\""
      end tell
      activate
    end tell
  `;
};

const makeNewWindowScript = (path: string) => {
  const p = escapeForAppleScript(path);
  return `
    tell application "iTerm"
      launch
      repeat until application "iTerm" is running
        delay 0.1
      end repeat
      set w to create window with default profile
      tell current session of w
        write text "cd \\"${p}\\""
      end tell
      activate
    end tell
  `;
};

const makeSplitScript = (path: string, direction: "horizontally" | "vertically") => {
  const p = escapeForAppleScript(path);
  return `
    on isAppRunning(appName)
      tell application "System Events" to (name of processes) contains appName
    end isAppRunning

    if isAppRunning("iTerm2") or isAppRunning("iTerm") then
      tell application "iTerm"
        activate
        tell current session of current window
          set newSession to split ${direction} with default profile
        end tell
        tell newSession
          write text "cd \\"${p}\\""
        end tell
      end tell
      return "true"
    else
      return "iTerm is not running"
    end if
  `;
};

const splitWithIt2api = (path: string, vertical: boolean) => {
  const focusedId = getFocusedSessionId();
  if (!focusedId) throw new Error("No active session found");
  const newSessionId = splitPane(focusedId, vertical);
  sendText(newSessionId, `cd "${path}"\n`);
};

export default function Command() {
  const { projectsDirectory } = getPreferenceValues<Preferences.SearchProjects>();
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [gitInfo, setGitInfo] = useState<Map<string, GitInfo>>(new Map());

  const resolvedDir = projectsDirectory || "~/Projects";
  const projects = useMemo(() => getProjects(resolvedDir), [resolvedDir]);

  useEffect(() => {
    if (!projects.length) return;
    Promise.all(
      projects.map(async ({ path }) => {
        const branch = await gitAsync(path, "rev-parse --abbrev-ref HEAD");
        const version = branch ? await gitAsync(path, "describe --tags --abbrev=0") : undefined;
        return [path, { branch, version }] as const;
      }),
    ).then((entries) => setGitInfo(new Map(entries)));
  }, [projects]);

  const runScript = async (script: string, errorTitle: string) => {
    try {
      const result = await runAppleScript(script);
      if (result && result !== "true") await showHUD(result);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: errorTitle, message: error.message });
    }
  };

  const splitProject = async (path: string, vertical: boolean, name: string) => {
    if (isIt2apiAvailable()) {
      try {
        splitWithIt2api(path, vertical);
        await closeMainWindow();
        await popToRoot();
        return;
      } catch {
        // fall through to AppleScript
      }
    } else {
      warnIt2apiMissing();
    }
    await runScript(makeSplitScript(path, vertical ? "vertically" : "horizontally"), `Cannot split for "${name}"`);
  };

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List searchBarPlaceholder="Search projects...">
      {projects.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects found"
          description={`No folders found in ${resolvedDir}`}
        />
      )}
      {projects.map((project) => {
        const info = gitInfo.get(project.path);
        return (
          <List.Item
            key={project.path}
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.path.replace(homedir(), "~")}
            accessories={[
              info?.branch ? { tag: { value: info.branch, color: Color.Blue } } : undefined,
              info?.version ? { tag: { value: info.version, color: Color.Green } } : undefined,
            ].filter((a): a is NonNullable<typeof a> => a != null)}
            actions={
              <ActionPanel>
                <Action
                  title="Open in New Tab"
                  icon={Icon.Plus}
                  onAction={() => runScript(makeNewTabScript(project.path), `Cannot open "${project.name}"`)}
                />
                <Action
                  title="Open in New Window"
                  icon={Icon.Window}
                  onAction={() => runScript(makeNewWindowScript(project.path), `Cannot open "${project.name}"`)}
                />
                <ActionPanel.Section title="Split Pane">
                  <Action
                    title="Open in Horizontal Split"
                    icon={Icon.AppWindowSidebarRight}
                    onAction={() => splitProject(project.path, false, project.name)}
                  />
                  <Action
                    title="Open in Vertical Split"
                    icon={Icon.AppWindowSidebarLeft}
                    onAction={() => splitProject(project.path, true, project.name)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
