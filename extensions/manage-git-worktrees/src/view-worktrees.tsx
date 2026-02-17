import {
  Action,
  ActionPanel,
  Application,
  Color,
  Icon,
  List,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { useState } from "react";

const execFileAsync = promisify(execFile);

type Preferences = {
  repositories: string;
  defaultIDE: Application;
  defaultTerminal: Application;
};

type InvalidRepo = {
  input: string;
  resolved: string;
  reason: string;
};

type WorktreeStatus = "synced" | "clean" | "dirty";

type Worktree = {
  path: string;
  branch?: string;
  detached: boolean;
  status: WorktreeStatus;
};

type RepoWorktrees = {
  name: string;
  path: string;
  worktrees: Worktree[];
};

type WorktreeScanResult = {
  repos: RepoWorktrees[];
  invalidRepos: InvalidRepo[];
};

function parsePathInputs(rawValue: string): string[] {
  const values = rawValue
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function resolveConfiguredPath(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return path.resolve(inputPath);
}

async function checkDirectory(targetPath: string): Promise<boolean> {
  try {
    const info = await stat(targetPath);
    return info.isDirectory();
  } catch {
    return false;
  }
}

function parseBranchName(branchRef: string): string {
  return branchRef.startsWith("refs/heads/") ? branchRef.slice("refs/heads/".length) : branchRef;
}

function parseWorktreeListOutput(stdout: string): Worktree[] {
  const worktrees: Worktree[] = [];
  const lines = stdout.split("\n");
  let current: Partial<Worktree> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    if (line.startsWith("worktree ")) {
      if (current?.path) {
        worktrees.push({
          path: current.path,
          branch: current.branch,
          detached: current.detached ?? false,
          status: "clean",
        });
      }

      current = { path: line.slice("worktree ".length), detached: false };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("branch ")) {
      current.branch = parseBranchName(line.slice("branch ".length));
      continue;
    }

    if (line === "detached") {
      current.detached = true;
    }
  }

  if (current?.path) {
    worktrees.push({
      path: current.path,
      branch: current.branch,
      detached: current.detached ?? false,
      status: "clean",
    });
  }

  return worktrees;
}

async function getWorktreeStatus(worktreePath: string): Promise<WorktreeStatus> {
  const { stdout: porcelain } = await execFileAsync("git", ["-C", worktreePath, "status", "--porcelain"]);
  if (porcelain.trim().length > 0) {
    return "dirty";
  }

  try {
    const { stdout: revList } = await execFileAsync("git", [
      "-C",
      worktreePath,
      "rev-list",
      "--left-right",
      "--count",
      "HEAD...@{upstream}",
    ]);
    const [ahead, behind] = revList.trim().split(/\s+/).map(Number);
    if (ahead === 0 && behind === 0) {
      return "synced";
    }
    return "clean";
  } catch {
    // No upstream configured — can't determine sync status
    return "clean";
  }
}

async function getRepoWorktrees(repoPath: string): Promise<Worktree[]> {
  const { stdout } = await execFileAsync("git", ["-C", repoPath, "worktree", "list", "--porcelain"]);
  const worktrees = parseWorktreeListOutput(stdout);

  return Promise.all(
    worktrees.map(async (wt) => ({
      ...wt,
      status: await getWorktreeStatus(wt.path),
    })),
  );
}

async function scanWorktrees(rawRepos: string): Promise<WorktreeScanResult> {
  const invalidRepos: InvalidRepo[] = [];
  const configuredRepos = parsePathInputs(rawRepos).map((repoInput) => ({
    input: repoInput,
    resolved: resolveConfiguredPath(repoInput),
  }));
  const repos = [...new Map(configuredRepos.map((repo) => [repo.resolved, repo])).values()];
  const validRepos: RepoWorktrees[] = [];

  for (const repo of repos) {
    if (!(await checkDirectory(repo.resolved))) {
      invalidRepos.push({
        input: repo.input,
        resolved: repo.resolved,
        reason: "Directory not found",
      });
      continue;
    }

    let worktrees;
    try {
      worktrees = await getRepoWorktrees(repo.resolved);
    } catch (error) {
      invalidRepos.push({
        input: repo.input,
        resolved: repo.resolved,
        reason: error instanceof Error ? error.message : "Unable to read directory",
      });
      continue;
    }

    validRepos.push({
      name: path.basename(repo.resolved),
      path: repo.resolved,
      worktrees,
    });
  }

  validRepos.sort((a, b) => a.name.localeCompare(b.name));

  return {
    repos: validRepos,
    invalidRepos,
  };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading } = usePromise(scanWorktrees, [preferences.repositories]);
  const [searchText, setSearchText] = useState("");

  const filteredRepos =
    data?.repos.flatMap((repo) => {
      const repoMatches = repo.name.toLowerCase().includes(searchText.toLowerCase());
      const worktreeMatches = repo.worktrees.filter(
        (worktree) =>
          worktree.path.toLowerCase().includes(searchText.toLowerCase()) ||
          worktree.branch?.toLowerCase().includes(searchText.toLowerCase()) ||
          worktree.status.toLowerCase().includes(searchText.toLowerCase()),
      );

      if (repoMatches) {
        return repo;
      }

      if (worktreeMatches.length > 0) {
        return {
          ...repo,
          worktrees: worktreeMatches,
        };
      }

      return [];
    }) ?? [];

  const ide = preferences.defaultIDE;
  const terminal = preferences.defaultTerminal;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search worktrees by repo, path, branch, status"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {data?.invalidRepos.length ? (
        <List.Section title="Invalid repositories">
          {data.invalidRepos.map((invalidRepo) => (
            <List.Item
              key={invalidRepo.resolved}
              icon={Icon.Warning}
              title={invalidRepo.input}
              subtitle={`${invalidRepo.reason}: ${invalidRepo.resolved}`}
              actions={
                <ActionPanel>
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action.CopyToClipboard content={invalidRepo.input} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {filteredRepos.map((repo) => (
        <List.Section key={repo.path} title={repo.name} subtitle={`${repo.worktrees.length} worktrees · ${repo.path}`}>
          {repo.worktrees.map((worktree) => (
            <List.Item
              key={worktree.path}
              icon={Icon.Folder}
              title={worktree.detached ? "Detached" : (worktree.branch ?? "unknown")}
              subtitle={worktree.path}
              accessories={[
                {
                  tag: {
                    value: capitalize(worktree.status),
                    color:
                      worktree.status === "synced"
                        ? Color.Green
                        : worktree.status === "clean"
                          ? Color.Blue
                          : Color.Orange,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open in ${ide.name}`}
                    icon={{ fileIcon: ide.path }}
                    onAction={() => open(worktree.path, ide)}
                  />
                  <Action.CopyToClipboard content={worktree.path} />
                  <Action
                    title={`Open in ${terminal.name}`}
                    icon={{ fileIcon: terminal.path }}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => open(worktree.path, terminal)}
                  />
                  <Action.ShowInFinder path={worktree.path} />
                  <Action.CopyToClipboard
                    title="Copy Repository Path"
                    content={repo.path}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
