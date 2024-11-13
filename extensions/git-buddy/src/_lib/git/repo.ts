import { getPreferenceValues } from "@raycast/api";
import { ERROR_MESSAGES } from "../../_constants";
import { runGitCommand } from "./queue";
import path from "path";

async function isValidRepo(repoPath: string): Promise<boolean> {
  try {
    const result = await runGitCommand(`git rev-parse --is-inside-work-tree`, repoPath);
    return result === "true";
  } catch {
    return false;
  }
}

export async function getRepoPath(): Promise<string> {
  const preferences = await getPreferenceValues<{ "repo-path": string }>();
  const repoPath = preferences["repo-path"];
  if (!repoPath) {
    throw new Error(ERROR_MESSAGES.REPO_PATH_MISSING);
  }
  if (!(await isValidRepo(repoPath))) {
    throw new Error(ERROR_MESSAGES.INVALID_REPO);
  }
  return repoPath;
}

export async function getRepoDisplayName(): Promise<string> {
  const repoPath = await getRepoPath();
  return path.basename(repoPath);
}
