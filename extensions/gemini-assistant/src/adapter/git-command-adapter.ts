import { execSync } from "node:child_process";

export function runGitCommand(repositoryPath: string, command: string): string {
  try {
    return execSync(command, {
      cwd: repositoryPath,
      stdio: "pipe",
    })
      .toString()
      .trim();
  } catch (error) {
    return `❌ Error executing Git command: ${command}`;
  }
}

export function getBranches(repositoryPath: string): string[] {
  return runGitCommand(repositoryPath, "git branch --format='%(refname:short)'").split("\n");
}

export function getGitDiff(repositoryPath: string, currentBranch: string, targetBranch: string): string {
  return runGitCommand(repositoryPath, `git diff ${targetBranch}..${currentBranch}`);
}
