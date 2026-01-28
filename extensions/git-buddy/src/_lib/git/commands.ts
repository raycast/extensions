import { ERROR_MESSAGES } from "../../_constants";
import { runGitCommand } from "./queue";

export async function getStagedGitDiff(repoPath: string): Promise<string> {
  try {
    let gitDiff = await runGitCommand(`git diff --staged`, repoPath);
    if (!gitDiff) {
      await runGitCommand(`git add .`, repoPath);
      gitDiff = await runGitCommand(`git diff --staged`, repoPath);
    }
    return gitDiff;
  } catch (error) {
    throw new Error(ERROR_MESSAGES.GIT_DIFF_EMPTY);
  }
}

export async function commitChanges(repoPath: string, commitMessage: string): Promise<void> {
  await runGitCommand(`git commit -m "${commitMessage}"`, repoPath);
}

export async function getCurrentBranchName(repoPath: string): Promise<string> {
  return runGitCommand(`git rev-parse --abbrev-ref HEAD`, repoPath);
}

export async function getDiffComparedToBranch(repoPath: string, baseBranch: string): Promise<string> {
  return runGitCommand(`git diff ${baseBranch}`, repoPath);
}
