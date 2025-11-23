import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { getPreferenceValues } from "@raycast/api";
import type { Preferences, RepoConfig } from "../types";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getRepos(): RepoConfig[] {
  const prefs = getPreferences();
  const repos: RepoConfig[] = [];

  if (prefs.autoDiscover) {
    // Auto-discover git repos in directory
    try {
      const entries = fs.readdirSync(prefs.reposDirectory, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Skip worktree folders (wt-* naming convention)
        if (entry.name.startsWith("wt-")) continue;

        const repoPath = path.join(prefs.reposDirectory, entry.name);
        const gitPath = path.join(repoPath, ".git");

        // Check if it's a git repo (either .git dir or .git file for worktrees)
        if (!fs.existsSync(gitPath)) continue;

        // Get default branch
        let defaultBranch = "main";
        try {
          const headRef = execSync(
            "git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null",
            {
              cwd: repoPath,
              encoding: "utf-8",
            },
          ).trim();
          defaultBranch = headRef.replace("refs/remotes/origin/", "");
        } catch {
          // Fallback: check for main or master
          try {
            execSync("git show-ref --verify --quiet refs/heads/main", {
              cwd: repoPath,
            });
            defaultBranch = "main";
          } catch {
            try {
              execSync("git show-ref --verify --quiet refs/heads/master", {
                cwd: repoPath,
              });
              defaultBranch = "master";
            } catch {
              defaultBranch = "main";
            }
          }
        }

        repos.push({ name: entry.name, defaultBranch });
      }
    } catch (e) {
      console.error("Failed to auto-discover repos:", e);
    }
  } else if (prefs.repositories) {
    // Parse manual config: "name:branch:hotfix,name2:branch2"
    const parts = prefs.repositories.split(",");
    for (const part of parts) {
      const [name, defaultBranch, hotfixBranch] = part.trim().split(":");
      if (name && defaultBranch) {
        repos.push({
          name,
          defaultBranch,
          hotfixBranch: hotfixBranch || undefined,
        });
      }
    }
  }

  return repos;
}

export function getRepoPath(repoName: string): string {
  const prefs = getPreferences();
  return path.join(prefs.reposDirectory, repoName);
}
