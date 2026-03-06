import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  Toast,
  showToast,
  Application,
  closeMainWindow,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

interface Preferences {
  projectPaths: string;
  editorApp: Application;
  editorAppAlt: Application;
  maxParallelProcesses: string;
}

function openInApp(appPath: string, projectPath: string) {
  spawn("open", ["-a", appPath, projectPath], { env: {} });
  closeMainWindow();
}

type RepoStatus = "idle" | "pulling" | "updated" | "up-to-date" | "dirty" | "error";

interface Repo {
  name: string;
  path: string;
  status: RepoStatus;
  branch: string;
  error?: string;
}

interface ProjectGroup {
  name: string;
  path: string;
}

function resolvePath(p: string): string {
  return p.startsWith("~") ? p.replace("~", homedir()) : p;
}

function getProjectGroups(): ProjectGroup[] {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.projectPaths
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => {
      const resolved = resolvePath(p);
      return { name: basename(resolved), path: resolved };
    });
}

function countRepos(groupPath: string): number {
  if (!existsSync(groupPath)) return 0;
  try {
    return readdirSync(groupPath).filter((entry) => {
      const fullPath = join(groupPath, entry);
      try {
        return statSync(fullPath).isDirectory() && existsSync(join(fullPath, ".git"));
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

async function getBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`git -C "${repoPath}" rev-parse --abbrev-ref HEAD`);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

async function scanRepos(groupPath: string): Promise<Repo[]> {
  if (!existsSync(groupPath)) return [];

  const entries = readdirSync(groupPath);
  const repos: Repo[] = [];

  for (const entry of entries) {
    const fullPath = join(groupPath, entry);
    try {
      if (statSync(fullPath).isDirectory() && existsSync(join(fullPath, ".git"))) {
        const branch = await getBranch(fullPath);
        repos.push({ name: entry, path: fullPath, status: "idle", branch });
      }
    } catch {
      continue;
    }
  }

  return repos;
}

async function isDirty(repoPath: string): Promise<boolean> {
  try {
    await execAsync(`git -C "${repoPath}" diff --quiet`);
    await execAsync(`git -C "${repoPath}" diff --cached --quiet`);
    return false;
  } catch {
    return true;
  }
}

async function pullRepo(repoPath: string): Promise<{ status: RepoStatus; error?: string }> {
  if (await isDirty(repoPath)) {
    return { status: "dirty" };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { stdout, stderr } = await execAsync(`git -C "${repoPath}" pull --ff-only`);
      const output = stdout + stderr;
      if (output.includes("Already up to date") || output.includes("Already up-to-date")) {
        return { status: "up-to-date" };
      }
      return { status: "updated" };
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  // all ff-only retries failed, fallback to normal pull
  try {
    const { stdout, stderr } = await execAsync(`git -C "${repoPath}" pull`);
    const output = stdout + stderr;
    if (output.includes("Already up to date") || output.includes("Already up-to-date")) {
      return { status: "up-to-date" };
    }
    return { status: "updated" };
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    const msg = (err.stderr || err.message || "Unknown error").trim().substring(0, 200);
    return { status: "error", error: msg };
  }
}

async function parallelPull(
  repos: { path: string; index: number }[],
  maxConcurrency: number,
  onUpdate: (index: number, status: RepoStatus, error?: string) => void,
) {
  let nextIdx = 0;
  let running = 0;

  return new Promise<void>((resolve) => {
    if (repos.length === 0) return resolve();

    function startNext() {
      while (running < maxConcurrency && nextIdx < repos.length) {
        const repo = repos[nextIdx++];
        running++;

        pullRepo(repo.path).then((result) => {
          onUpdate(repo.index, result.status, result.error);
          running--;
          if (nextIdx < repos.length) {
            startNext();
          } else if (running === 0) {
            resolve();
          }
        });
      }
    }

    startNext();
  });
}

function getStatusIcon(status: RepoStatus) {
  switch (status) {
    case "idle":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "pulling":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "updated":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "up-to-date":
      return { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
    case "dirty":
      return { source: Icon.Warning, tintColor: Color.Yellow };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function getStatusTag(status: RepoStatus): { value: string; color: Color } {
  switch (status) {
    case "idle":
      return { value: "Ready", color: Color.SecondaryText };
    case "pulling":
      return { value: "Pulling...", color: Color.Blue };
    case "updated":
      return { value: "Updated", color: Color.Green };
    case "up-to-date":
      return { value: "Up to date", color: Color.SecondaryText };
    case "dirty":
      return { value: "Uncommitted changes", color: Color.Yellow };
    case "error":
      return { value: "Failed", color: Color.Red };
  }
}

function PullProgress({ group }: { group: ProjectGroup }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const prefs = getPreferenceValues<Preferences>();
  const maxParallel = parseInt(prefs.maxParallelProcesses) || 10;

  const updateRepo = useCallback((index: number, status: RepoStatus, error?: string) => {
    setRepos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status, error };
      return next;
    });
  }, []);

  const startPull = useCallback(
    async (repoList: Repo[]) => {
      setIsPulling(true);
      const targets = repoList.map((r, i) => ({ ...r, index: i }));
      let done = 0;
      const total = targets.length;
      setProgress({ done: 0, total });

      targets.forEach((r) => updateRepo(r.index, "pulling"));

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Pulling ${group.name}...`,
        message: `0/${total}`,
      });

      await parallelPull(targets, maxParallel, (index, status, error) => {
        updateRepo(index, status, error);
        done++;
        setProgress({ done, total });
        toast.message = `${done}/${total}`;
      });

      const finalRepos = await new Promise<Repo[]>((resolve) => {
        setRepos((prev) => {
          resolve(prev);
          return prev;
        });
      });

      const updated = finalRepos.filter((r) => r.status === "updated").length;
      const failed = finalRepos.filter((r) => r.status === "error").length;
      const dirty = finalRepos.filter((r) => r.status === "dirty").length;

      toast.style = failed > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = `Done: ${updated} updated, ${failed} failed, ${dirty} skipped`;
      toast.message = undefined;
      setIsPulling(false);
    },
    [group.name, maxParallel, updateRepo],
  );

  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    async function load() {
      const scanned = await scanRepos(group.path);
      setRepos(scanned);
      setIsLoading(false);
      startPull(scanned);
    }
    load();
  }, []);

  const pullSingle = useCallback(
    async (index: number) => {
      updateRepo(index, "pulling");
      const result = await pullRepo(repos[index].path);
      updateRepo(index, result.status, result.error);
    },
    [repos, updateRepo],
  );

  const retryAll = useCallback(async () => {
    await startPull(repos);
  }, [repos, startPull]);

  const isDone = !isLoading && !isPulling;
  const sectionOrder: RepoStatus[] = ["error", "dirty", "updated", "up-to-date", "pulling", "idle"];
  const sectionTitles: Record<string, string> = {
    error: "Failed",
    dirty: "Uncommitted Changes",
    updated: "Updated",
    "up-to-date": "Up to Date",
    pulling: "Pulling",
    idle: "Ready",
  };

  const { editorApp, editorAppAlt } = getPreferenceValues<Preferences>();

  const repoItem = (repo: Repo, index: number) => (
    <List.Item
      key={repo.path}
      icon={getStatusIcon(repo.status)}
      title={repo.name}
      subtitle={repo.status === "error" && repo.error ? repo.error : repo.branch}
      accessories={[{ tag: getStatusTag(repo.status) }]}
      actions={
        <ActionPanel>
          <Action title="Pull" icon={Icon.Download} onAction={() => pullSingle(index)} />
          <Action title="Pull All Again" icon={Icon.RotateClockwise} onAction={retryAll} />
          <ActionPanel.Section title="Open">
            <Action
              title={`Open in ${editorApp.name}`}
              icon={{ fileIcon: editorApp.path }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => openInApp(editorApp.path, repo.path)}
            />
            {editorAppAlt && (
              <Action
                title={`Open in ${editorAppAlt.name}`}
                icon={{ fileIcon: editorAppAlt.path }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => openInApp(editorAppAlt.path, repo.path)}
              />
            )}
            <Action.ShowInFinder path={repo.path} />
            <Action.OpenWith path={repo.path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading || isPulling}
      navigationTitle={isPulling ? `${group.name} — ${progress.done}/${progress.total}` : group.name}
    >
      {isDone
        ? sectionOrder
            .filter((status) => repos.some((r) => r.status === status))
            .map((status) => (
              <List.Section
                key={status}
                title={sectionTitles[status]}
                subtitle={`${repos.filter((r) => r.status === status).length}`}
              >
                {repos.map((repo, index) => (repo.status === status ? repoItem(repo, index) : null))}
              </List.Section>
            ))
        : repos.map((repo, index) => repoItem(repo, index))}
    </List>
  );
}

export default function Command() {
  const groups = getProjectGroups();
  const { push } = useNavigation();

  return (
    <List>
      {groups.map((group) => {
        const repoCount = countRepos(group.path);
        return (
          <List.Item
            key={group.path}
            icon={Icon.Folder}
            title={group.name}
            accessories={[{ text: `${repoCount} repos` }]}
            actions={
              <ActionPanel>
                <Action title="Pull All" icon={Icon.Download} onAction={() => push(<PullProgress group={group} />)} />
                <Action.ShowInFinder path={group.path} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
