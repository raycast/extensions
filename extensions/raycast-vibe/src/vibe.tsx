import {
  Action,
  Alert,
  ActionPanel,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import React from "react";
import { Agent, agents, pickHeadlessAgent } from "./agents";
import { AskForm } from "./views/AskForm";
import { runAICommit } from "./aiCommit";
import { runAIPRDescription } from "./aiPRDescription";
import { TemplateList } from "./views/TemplateList";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { WorktreeList } from "./views/WorktreeList";
import { WorktreeAgentPicker } from "./views/WorktreeAgentPicker";
import { GitHubDashboard } from "./views/GitHubDashboard";
import { createPullRequestWeb, ghAvailability } from "./github";

const execFileAsync = promisify(execFile);
export const RECENT_FOLDERS_KEY = "recent-vibe-folders";
const PINNED_FOLDERS_KEY = "pinned-vibe-folders";
const MAX_RECENT_FOLDERS = 20;
export const LAST_AGENTS_KEY = "last-vibe-agents";

export type Folder = {
  name: string;
  path: string;
  branch?: string;
  repositoryRoot?: string;
  repositoryName?: string;
  remote?: string;
  changed?: number;
  untracked?: number;
  ahead?: number;
  behind?: number;
  detached?: boolean;
  projectType?: string;
};

function preferences(): Preferences.Vibe {
  return getPreferenceValues<Preferences.Vibe>();
}

function escapeSpotlightText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function isUsefulFolder(folder: string): boolean {
  return Boolean(
    folder &&
    !folder.split(/[\\/]/).some((part) => part.startsWith(".")) &&
    !/[\\/]node_modules[\\/]/.test(folder) &&
    !/[\\/]\.git[\\/]/.test(folder) &&
    !/[\\/](Library|DerivedData|Caches)[\\/]/.test(folder),
  );
}

export function shellQuote(value: string): string {
  if (process.platform === "win32") return `'${value.replaceAll("'", "''")}'`;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function powershellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function openPath(path: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("explorer.exe", [path]);
  } else {
    await execFileAsync("/usr/bin/open", [path]);
  }
}

export async function openUrl(url: string): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "start", "", url]);
  } else {
    await execFileAsync("/usr/bin/open", [url]);
  }
}

export async function openApplication(
  application: string,
  path: string,
): Promise<void> {
  if (process.platform === "win32") {
    const executable = application === "Visual Studio Code" ? "code" : "cursor";
    await execFileAsync(executable, [path]);
  } else {
    await execFileAsync("/usr/bin/open", ["-a", application, path]);
  }
}

function appleScriptQuote(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

const gitExecutable = process.platform === "win32" ? "git" : "/usr/bin/git";

async function git(folder: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      gitExecutable,
      ["-C", folder, ...args],
      { timeout: 1500 },
    );
    return stdout.trim();
  } catch {
    return "";
  }
}

async function runGit(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(gitExecutable, ["-C", root, ...args], {
    timeout: 30_000,
  });
  return stdout.trim();
}

async function isDirty(root: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      gitExecutable,
      ["-C", root, "status", "--porcelain"],
      { timeout: 5_000 },
    );
    return Boolean(stdout.trim());
  } catch {
    // Fail closed: never perform a potentially destructive Git action when
    // the working-tree state cannot be inspected.
    return true;
  }
}

type GitBranch = {
  name: string;
  remote?: string;
  current: boolean;
};

export async function listBranches(
  root: string,
): Promise<{ local: GitBranch[]; remote: GitBranch[] }> {
  const [localOutput, remoteOutput] = await Promise.all([
    git(root, [
      "for-each-ref",
      "--format=%(refname:short)|%(HEAD)",
      "refs/heads",
    ]),
    git(root, ["for-each-ref", "--format=%(refname:short)", "refs/remotes"]),
  ]);
  const local = localOutput
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, head] = line.split("|");
      return { name, current: head === "*" };
    });
  const remote = remoteOutput
    .split("\n")
    .filter((name) => name && !name.endsWith("/HEAD"))
    .map((name) => ({
      name: name.replace(/^[^/]+\//, ""),
      remote: name,
      current: false,
    }));
  return { local, remote };
}

export function gitErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const detail = message
    .split("\n")
    .find((line) => line.trim())
    ?.trim();
  if (!detail) return fallback;
  if (/diverg|not possible|non-fast-forward/i.test(message))
    return "Branches have diverged. Resolve manually in Git.";
  if (/no upstream/i.test(message))
    return "This branch has no upstream remote.";
  return detail.length > 140 ? fallback : detail;
}

export async function confirmGitChange(
  title: string,
  message: string,
): Promise<boolean> {
  return confirmAlert({
    title,
    message,
    icon: Icon.Warning,
    primaryAction: { title: "Continue", style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Cancel" },
  });
}

async function ensureSafeGitSwitch(root: string): Promise<boolean> {
  if (!(await isDirty(root))) return true;
  return confirmGitChange(
    "Uncommitted Changes",
    "This repository has uncommitted changes. Switching branches may cause conflicts.",
  );
}

function detectProjectType(folder: string): string | undefined {
  const markers: [string, string][] = [
    ["package.json", "Node"],
    ["pyproject.toml", "Python"],
    ["requirements.txt", "Python"],
    ["go.mod", "Go"],
    ["Cargo.toml", "Rust"],
    ["Gemfile", "Ruby"],
    ["composer.json", "PHP"],
  ];
  return markers.find(([marker]) => existsSync(`${folder}/${marker}`))?.[1];
}

async function inspectGit(folder: Folder): Promise<Folder> {
  const root = await git(folder.path, ["rev-parse", "--show-toplevel"]);
  if (!root) return { ...folder, projectType: detectProjectType(folder.path) };
  const repositoryName = basename(root);
  const remote = await git(folder.path, ["remote", "get-url", "origin"]);
  const branch = await git(folder.path, ["branch", "--show-current"]);
  const status = await git(folder.path, ["status", "--porcelain"]);
  const lines = status ? status.split("\n") : [];
  const untracked = lines.filter((line) => line.startsWith("??")).length;
  const changed = lines.filter((line) => !line.startsWith("??")).length;
  const counts = await git(folder.path, [
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...@{upstream}",
  ]);
  const [aheadText, behindText] = counts.split(/\s+/).filter(Boolean);
  return {
    ...folder,
    repositoryRoot: root,
    repositoryName,
    remote: remote || undefined,
    branch: branch || undefined,
    detached: !branch,
    changed,
    untracked,
    ahead: Number(aheadText || 0),
    behind: Number(behindText || 0),
  };
}

async function enrichFolders(folders: Folder[]): Promise<Folder[]> {
  return Promise.all(folders.map(inspectGit));
}

async function searchFolders(query: string): Promise<Folder[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const escaped = escapeSpotlightText(trimmed);
  const spotlightQuery = `kMDItemContentType == 'public.folder' && (kMDItemFSName == '*${escaped}*'cd || kMDItemPath == '*${escaped}*'cd)`;
  const [{ stdout }, gitDirs] =
    process.platform === "win32"
      ? await Promise.all([
          execFileAsync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              `$q = '${trimmed.replaceAll("'", "''")}'; Get-ChildItem -Path $env:USERPROFILE -Directory -Recurse -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$q*" -or $_.FullName -like "*$q*" } | Select-Object -ExpandProperty FullName`,
            ],
            { maxBuffer: 4 * 1024 * 1024, timeout: 15_000 },
          ),
          execFileAsync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              `Get-ChildItem -Path $env:USERPROFILE -Directory -Recurse -Force -Filter .git -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Parent`,
            ],
            { maxBuffer: 4 * 1024 * 1024, timeout: 15_000 },
          ).catch(() => ({ stdout: "" })),
        ])
      : await Promise.all([
          execFileAsync("/usr/bin/mdfind", [spotlightQuery], {
            maxBuffer: 2 * 1024 * 1024,
          }),
          execFileAsync(
            "/usr/bin/mdfind",
            [
              "kMDItemFSName == '.git' && kMDItemContentType == 'public.folder'",
            ],
            { maxBuffer: 4 * 1024 * 1024 },
          ).catch(() => ({ stdout: "" })),
        ]);
  const paths = new Set<string>();
  stdout
    .split("\n")
    .map((path) => path.trim())
    .filter(isUsefulFolder)
    .forEach((path) => paths.add(path));
  gitDirs.stdout
    .split("\n")
    .map((path) => path.trim())
    .filter((path) => path.endsWith("/.git"))
    .forEach((path) => paths.add(path.slice(0, -5)));
  const candidates = await enrichFolders(
    Array.from(paths)
      .slice(0, 500)
      .map((path) => ({ name: basename(path), path })),
  );
  const lower = trimmed.toLowerCase();
  const matches = candidates.filter((folder) =>
    [folder.name, folder.path, folder.repositoryName, folder.remote].some(
      (value) => value?.toLowerCase().includes(lower),
    ),
  );
  matches.sort((a, b) => {
    const score = (folder: Folder) =>
      [
        folder.name,
        folder.repositoryName,
        folder.remote,
        folder.path,
      ].findIndex((value) => value?.toLowerCase().startsWith(lower));
    return (
      (score(a) < 0 ? 99 : score(a)) - (score(b) < 0 ? 99 : score(b)) ||
      a.path.length - b.path.length
    );
  });
  return matches.slice(0, 100);
}

export async function getPaths(key: string, max?: number): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(key);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    )
      return [];
    return parsed.slice(0, max);
  } catch {
    return [];
  }
}

async function setPaths(key: string, paths: string[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(paths));
}

async function loadFolderItems(key: string, max?: number): Promise<Folder[]> {
  const paths = await getPaths(key, max);
  const existing = paths.filter((path) => existsSync(path));
  if (existing.length !== paths.length) await setPaths(key, existing);
  return enrichFolders(
    existing.map((path) => ({ name: basename(path), path })),
  );
}

async function getLastAgents(): Promise<Record<string, string>> {
  const stored = await LocalStorage.getItem<string>(LAST_AGENTS_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

async function rememberAgent(folder: string, agent: Agent): Promise<void> {
  const agents = await getLastAgents();
  agents[folder] = agent.id;
  await LocalStorage.setItem(LAST_AGENTS_KEY, JSON.stringify(agents));
}

async function rememberFolder(folder: string): Promise<void> {
  const paths = await getPaths(RECENT_FOLDERS_KEY);
  await setPaths(
    RECENT_FOLDERS_KEY,
    [folder, ...paths.filter((path) => path !== folder)].slice(
      0,
      MAX_RECENT_FOLDERS,
    ),
  );
}

async function togglePinned(folder: string): Promise<boolean> {
  const paths = await getPaths(PINNED_FOLDERS_KEY);
  const pinned = paths.includes(folder);
  await setPaths(
    PINNED_FOLDERS_KEY,
    pinned ? paths.filter((path) => path !== folder) : [folder, ...paths],
  );
  return !pinned;
}

function gitAccessory(folder: Folder): { text: string; icon?: Icon }[] {
  if (!folder.repositoryRoot) return [];
  const parts = [
    folder.repositoryName || "repo",
    folder.detached ? "detached" : folder.branch || "unknown",
  ];
  if ((folder.changed || 0) > 0) parts.push(`✚${folder.changed}`);
  if ((folder.untracked || 0) > 0) parts.push(`?${folder.untracked}`);
  if ((folder.ahead || 0) > 0) parts.push(`↑${folder.ahead}`);
  if ((folder.behind || 0) > 0) parts.push(`↓${folder.behind}`);
  return [{ text: parts.join(" · "), icon: Icon.Code }];
}

export async function openInTerminal(
  folder: string,
  command: string,
): Promise<void> {
  const p = preferences();
  if (process.platform === "win32") {
    await execFileAsync("wt.exe", [
      "-d",
      folder,
      "powershell.exe",
      "-NoExit",
      "-Command",
      `Set-Location -LiteralPath ${shellQuote(folder)}; ${command}`,
    ]);
    return;
  }
  const shellCommand = `export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" && cd ${shellQuote(folder)} && ${command}`;
  const terminal = p.terminal || "terminal";
  if (terminal === "ghostty") {
    await execFileAsync("/usr/bin/open", [
      "-na",
      "/Applications/Ghostty.app",
      "--args",
      "-e",
      "/bin/zsh",
      "-lc",
      shellCommand,
    ]);
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      `delay 0.75\ntell application "Ghostty" to activate`,
    ]);
  } else if (terminal === "iterm") {
    const script = `tell application "iTerm" to tell current window to create tab with default profile command ${appleScriptQuote(`/bin/zsh -lc ${shellQuote(shellCommand)}`)}`;
    await execFileAsync("/usr/bin/osascript", ["-e", script]);
  } else {
    const script = `tell application "Terminal" to do script ${appleScriptQuote(shellCommand)}`;
    await execFileAsync("/usr/bin/osascript", ["-e", script]);
  }
}

export async function launchAgent(folder: string, agent: Agent): Promise<void> {
  const command =
    process.platform === "win32"
      ? agent.command
        ? `${
            agent.env
              ?.split("\n")
              .filter((line) => line.trim())
              .map((line) => {
                const separator = line.indexOf("=");
                if (separator < 1) return "";
                const key = line.slice(0, separator).trim();
                const value = line.slice(separator + 1).trim();
                return `$env:${key}=${powershellQuote(value)};`;
              })
              .filter(Boolean)
              .join(" ") || ""
          } & ${powershellQuote(agent.command)}${agent.args.trim() ? ` ${agent.args}` : ""}`
        : "powershell.exe"
      : agent.command
        ? `${
            agent.env?.trim()
              ? `export ${agent.env
                  .split("\n")
                  .filter(Boolean)
                  .map((line) => line.trim())
                  .join(" ")} && `
              : ""
          }exec ${shellQuote(agent.command)}${agent.args.trim() ? ` ${agent.args}` : ""}`
        : "exec /bin/zsh -l";
  try {
    await openInTerminal(folder, command);
    await rememberFolder(folder);
    await rememberAgent(folder, agent);
    await showToast({
      style: Toast.Style.Success,
      title: `${agent.name} started`,
      message: folder,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not start ${agent.name}`,
      message: String(error),
    });
  }
}

function GitActions({
  folder,
  onRefresh,
}: {
  folder: Folder;
  onRefresh?: () => void;
}) {
  const root = folder.repositoryRoot || folder.path;
  const refresh = () => onRefresh?.();

  const fetchAndRefresh = async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Fetching…",
      });
      await runGit(root, ["fetch", "--all", "--prune"]);
      refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Git status refreshed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not fetch from the remote",
        message: gitErrorMessage(error, "Fetch failed"),
      });
    }
  };

  const pullLatest = async () => {
    try {
      if (!(await ensureSafeGitSwitch(root))) return;
      await showToast({
        style: Toast.Style.Animated,
        title: "Pulling latest changes…",
      });
      await runGit(root, ["pull", "--ff-only"]);
      refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Pulled latest changes",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not pull the latest changes",
        message: gitErrorMessage(error, "Pull failed"),
      });
    }
  };

  return (
    <List navigationTitle={`Git Actions · ${folder.name}`}>
      <List.Item
        title="Fetch and Refresh Status"
        icon={Icon.Download}
        actions={
          <ActionPanel>
            <Action
              title="Fetch and Refresh Status"
              icon={Icon.Download}
              onAction={() => void fetchAndRefresh()}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Switch Branch"
        icon={Icon.Switch}
        actions={
          <ActionPanel>
            <Action.Push
              title="Switch Branch"
              icon={Icon.Switch}
              target={<BranchPicker folder={folder} onRefresh={onRefresh} />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Pull Latest"
        icon={Icon.ArrowClockwise}
        actions={
          <ActionPanel>
            <Action
              title="Pull Latest"
              icon={Icon.ArrowClockwise}
              onAction={() => void pullLatest()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function BranchPicker({
  folder,
  onRefresh,
}: {
  folder: Folder;
  onRefresh?: () => void;
}) {
  const root = folder.repositoryRoot || folder.path;
  const [branches, setBranches] = React.useState<{
    local: GitBranch[];
    remote: GitBranch[];
  }>({
    local: [],
    remote: [],
  });
  const [isLoading, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    void listBranches(root)
      .then(setBranches)
      .finally(() => setIsLoading(false));
  }, [root]);

  const switchBranch = async (branch: GitBranch) => {
    try {
      if (!(await ensureSafeGitSwitch(root))) return;
      if (branch.remote) {
        const confirmed = await confirmGitChange(
          `Create ${branch.name} locally?`,
          `This creates a local tracking branch for ${branch.remote}.`,
        );
        if (!confirmed) return;
        await runGit(root, [
          "switch",
          "--track",
          "-c",
          branch.name,
          branch.remote,
        ]);
      } else {
        await runGit(root, ["switch", branch.name]);
      }
      onRefresh?.();
      await showToast({
        style: Toast.Style.Success,
        title: `Switched to ${branch.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not switch branch",
        message: gitErrorMessage(error, "Branch switch failed"),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Switch branch in ${folder.name}`}
      searchBarPlaceholder="Search branches…"
    >
      <List.Section title="Local Branches">
        {branches.local.map((branch) => (
          <List.Item
            key={`local-${branch.name}`}
            title={branch.name}
            icon={branch.current ? Icon.CheckCircle : Icon.Circle}
            accessories={branch.current ? [{ text: "current" }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={`Switch to ${branch.name}`}
                  icon={Icon.Switch}
                  onAction={() => void switchBranch(branch)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Remote Branches">
        {branches.remote.map((branch) => (
          <List.Item
            key={`remote-${branch.remote}`}
            title={branch.name}
            subtitle={branch.remote}
            icon={Icon.Cloud}
            actions={
              <ActionPanel>
                <Action
                  title={`Create ${branch.name} and Switch`}
                  icon={Icon.Switch}
                  onAction={() => void switchBranch(branch)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function FolderActions({
  folder,
  pinned,
  onRefresh,
}: {
  folder: Folder;
  pinned: boolean;
  onRefresh?: () => void;
}) {
  const [lastAgentId, setLastAgentId] = React.useState<string | undefined>(
    undefined,
  );
  React.useEffect(() => {
    void getLastAgents().then((map) => setLastAgentId(map[folder.path]));
  }, [folder.path]);

  const resumeAgent = React.useMemo(() => {
    if (!lastAgentId) return undefined;
    const match = agents().find((a) => a.id === lastAgentId);
    return match && match.resumeArgs ? match : undefined;
  }, [lastAgentId]);

  const askAgent = React.useMemo(
    () => pickHeadlessAgent(agents(), lastAgentId),
    [lastAgentId],
  );
  const repoRoot = folder.repositoryRoot || folder.path;

  const githubRemote = React.useMemo(
    () => Boolean(folder.remote && folder.remote.includes("github.com")),
    [folder.remote],
  );

  return (
    <ActionPanel>
      <Action.Push
        title="Choose Agent"
        icon={Icon.Stars}
        target={<AgentPicker folder={folder} onRefresh={onRefresh} />}
      />
      <Action
        title="Open in Terminal"
        icon={Icon.Terminal}
        onAction={() => {
          const terminalAgent = agents().find(
            (agent) => agent.id === "terminal",
          );
          if (terminalAgent)
            void launchAgent(folder.path, terminalAgent).then(onRefresh);
        }}
      />
      {folder.repositoryRoot ? (
        <Action.Push
          title="Worktrees"
          icon={Icon.Tree}
          target={
            <WorktreeList
              repoRoot={folder.repositoryRoot}
              onRefresh={onRefresh}
            />
          }
        />
      ) : null}
      {folder.repositoryRoot ? (
        <Action.Push
          title="Launch Agent in New Worktree"
          icon={Icon.Rocket}
          target={
            <WorktreeAgentPicker
              repoRoot={folder.repositoryRoot}
              onCreated={() => onRefresh?.()}
            />
          }
        />
      ) : null}
      <Action
        title="Open in Visual Studio Code"
        icon={Icon.Code}
        onAction={() => void openApplication("Visual Studio Code", folder.path)}
      />
      <Action
        title="Open GitHub Repository"
        icon={Icon.Globe}
        onAction={async () => {
          const remote =
            folder.remote ||
            (await git(folder.path, ["remote", "get-url", "origin"]));
          const url = remote
            ?.replace(/^git@github.com:/, "https://github.com/")
            .replace(/\.git$/, "");
          if (url?.includes("github.com")) void openUrl(url);
          else
            await showToast({
              style: Toast.Style.Failure,
              title: "No GitHub remote found",
            });
        }}
      />
      {folder.repositoryRoot && githubRemote ? (
        <Action.Push
          title="GitHub"
          icon={Icon.Globe}
          target={<GitHubDashboard repoRoot={folder.repositoryRoot} />}
        />
      ) : null}
      {folder.repositoryRoot && githubRemote ? (
        <Action
          title="Create Pull Request"
          icon={Icon.NewDocument}
          onAction={async () => {
            const availability = await ghAvailability();
            if (availability === "missing") {
              await showToast({
                style: Toast.Style.Failure,
                title: "GitHub CLI (gh) is not installed",
                message: "Install it from https://cli.github.com/",
              });
              return;
            }
            if (availability === "unauthenticated") {
              await showToast({
                style: Toast.Style.Failure,
                title: "GitHub CLI is not authenticated",
                message: "Run gh auth login in a terminal.",
              });
              return;
            }
            try {
              await createPullRequestWeb(folder.repositoryRoot!);
            } catch (error) {
              const message =
                error instanceof Error && "stderr" in error
                  ? String(
                      (error as { stderr?: unknown }).stderr ?? error.message,
                    )
                  : error instanceof Error
                    ? error.message
                    : String(error);
              const friendly =
                /no upstream|no commits between|no default remote|no local branch/i.test(
                  message,
                )
                  ? "Push the branch to origin first (git push -u origin <branch>)."
                  : message;
              await showToast({
                style: Toast.Style.Failure,
                title: "Could not create pull request",
                message: friendly,
              });
            }
          }}
        />
      ) : null}
      {folder.repositoryRoot && githubRemote && askAgent ? (
        <Action
          title="AI Pull Request Description"
          icon={Icon.Text}
          onAction={() =>
            void runAIPRDescription(folder.repositoryRoot!, askAgent)
          }
        />
      ) : null}

      {resumeAgent ? (
        <Action
          title={`Resume ${resumeAgent.name}`}
          icon={Icon.Repeat}
          onAction={() =>
            void launchAgent(folder.path, {
              ...resumeAgent,
              args: resumeAgent.resumeArgs || "",
            }).then(onRefresh)
          }
        />
      ) : null}
      {askAgent ? (
        <Action.Push
          title="Ask About This Repo"
          icon={Icon.QuestionMark}
          target={
            <AskForm
              folder={{ path: folder.path, name: folder.name }}
              repoRoot={repoRoot}
              agent={askAgent}
            />
          }
        />
      ) : null}
      {askAgent && folder.repositoryRoot ? (
        <Action
          title="AI Commit Message"
          icon={Icon.CodeBlock}
          onAction={() => void runAICommit(repoRoot, askAgent)}
        />
      ) : null}
      <Action
        title="Run Again"
        icon={Icon.ArrowClockwise}
        onAction={async () => {
          const last = (await getLastAgents())[folder.path];
          const agent = agents().find((item) => item.id === last);
          if (agent) void launchAgent(folder.path, agent).then(onRefresh);
          else
            await showToast({
              style: Toast.Style.Failure,
              title: "No previous agent for this folder",
            });
        }}
      />
      {folder.repositoryRoot && folder.repositoryRoot !== folder.path ? (
        <Action.Push
          title="Open Repository Root"
          icon={Icon.Code}
          target={
            <AgentPicker
              folder={{
                ...folder,
                path: folder.repositoryRoot,
                name: basename(folder.repositoryRoot) || folder.repositoryRoot,
              }}
              onRefresh={onRefresh}
            />
          }
        />
      ) : null}
      <Action
        title={pinned ? "Unpin Folder" : "Pin Folder"}
        icon={pinned ? Icon.PinDisabled : Icon.Pin}
        onAction={async () => {
          await togglePinned(folder.path);
          onRefresh?.();
        }}
      />
      <Action
        title={
          process.platform === "win32"
            ? "Open in File Explorer"
            : "Open in Finder"
        }
        icon={Icon.Finder}
        onAction={() => void openPath(folder.path)}
      />
      <Action
        title="Open in Cursor"
        icon={Icon.Code}
        onAction={() => void openApplication("Cursor", folder.path)}
      />

      <Action.CopyToClipboard title="Copy Folder Path" content={folder.path} />
      <Action
        title="Remove from Recent Folders"
        icon={Icon.Trash}
        onAction={async () => {
          const paths = await getPaths(RECENT_FOLDERS_KEY);
          await setPaths(
            RECENT_FOLDERS_KEY,
            paths.filter((path) => path !== folder.path),
          );
          onRefresh?.();
        }}
      />
      {folder.repositoryRoot ? (
        <Action.Push
          title="Git Actions"
          icon={Icon.Code}
          target={<GitActions folder={folder} onRefresh={onRefresh} />}
        />
      ) : null}
    </ActionPanel>
  );
}

export function AgentPicker({
  folder,
  onRefresh,
}: {
  folder: Folder;
  onRefresh?: () => void;
}) {
  return (
    <List
      navigationTitle={`Run in ${folder.name}`}
      searchBarPlaceholder="Choose an agent…"
    >
      {agents().map((agent) => (
        <List.Item
          key={agent.id}
          icon={agent.icon}
          title={agent.name}
          subtitle={agent.description}
          actions={
            <ActionPanel>
              <Action
                title={`Run ${agent.name}`}
                icon={agent.icon}
                onAction={() =>
                  void launchAgent(folder.path, agent).then(onRefresh)
                }
              />
              {agent.id !== "terminal" ? (
                <Action.Push
                  title={`Launch ${agent.name} with Prompt…`}
                  icon={Icon.Text}
                  target={
                    <TemplateList
                      folder={{ path: folder.path, name: folder.name }}
                      agent={agent}
                      onRefresh={onRefresh}
                    />
                  }
                />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FolderItem({
  folder,
  pinned,
  recent,
  onRefresh,
}: {
  folder: Folder;
  pinned: boolean;
  recent?: boolean;
  onRefresh: () => void;
}) {
  const accessories = [...gitAccessory(folder)];
  if (folder.projectType) accessories.push({ text: folder.projectType });
  return (
    <List.Item
      icon={recent ? Icon.Clock : pinned ? Icon.Pin : Icon.Folder}
      title={folder.name}
      subtitle={folder.path}
      accessories={accessories}
      actions={
        <FolderActions folder={folder} pinned={pinned} onRefresh={onRefresh} />
      }
    />
  );
}

export default function Command() {
  const [query, setQuery] = React.useState("");
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [recentFolders, setRecentFolders] = React.useState<Folder[]>([]);
  const [pinnedFolders, setPinnedFolders] = React.useState<Folder[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const refresh = React.useCallback(() => {
    void Promise.all([
      loadFolderItems(RECENT_FOLDERS_KEY, MAX_RECENT_FOLDERS),
      loadFolderItems(PINNED_FOLDERS_KEY),
    ]).then(([recent, pinned]) => {
      setRecentFolders(recent);
      setPinnedFolders(pinned);
    });
  }, []);
  React.useEffect(() => {
    refresh();
  }, [refresh]);
  React.useEffect(() => {
    if (!query.trim()) {
      setFolders([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void searchFolders(query)
      .then((result) => {
        if (!cancelled) setFolders(result);
      })
      .catch(async (error) => {
        if (!cancelled)
          await showToast({
            style: Toast.Style.Failure,
            title: "Folder search failed",
            message: String(error),
          });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  const pinnedPaths = new Set(pinnedFolders.map((folder) => folder.path));
  return (
    <List
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search projects, paths, or repositories…"
      isLoading={isLoading}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Clear Recent Folders"
            icon={Icon.Trash}
            onAction={async () => {
              await setPaths(RECENT_FOLDERS_KEY, []);
              refresh();
              await showToast({
                style: Toast.Style.Success,
                title: "Recent folders cleared",
              });
            }}
          />
        </ActionPanel>
      }
    >
      {!query.trim() ? (
        <>
          {pinnedFolders.length > 0 ? (
            <List.Section title="Pinned Folders">
              {pinnedFolders.map((folder) => (
                <FolderItem
                  key={folder.path}
                  folder={folder}
                  pinned
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          ) : null}
          {recentFolders.length > 0 ? (
            <List.Section
              title="Recent Folders"
              subtitle={`${recentFolders.length} of ${MAX_RECENT_FOLDERS}`}
            >
              {recentFolders.map((folder) => (
                <FolderItem
                  key={folder.path}
                  folder={folder}
                  pinned={pinnedPaths.has(folder.path)}
                  recent
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          ) : null}
          {pinnedFolders.length === 0 && recentFolders.length === 0 ? (
            <List.EmptyView
              title="No folders yet"
              description="Search for a project to start an agent there"
              icon={Icon.Folder}
            />
          ) : null}
        </>
      ) : query && !isLoading && folders.length === 0 ? (
        <List.EmptyView
          title="No folders found"
          description="Try another project name or path"
          icon={Icon.Folder}
        />
      ) : (
        folders.map((folder) => (
          <FolderItem
            key={folder.path}
            folder={folder}
            pinned={pinnedPaths.has(folder.path)}
            onRefresh={refresh}
          />
        ))
      )}
    </List>
  );
}
