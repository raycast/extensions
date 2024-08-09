import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";

export async function runCommand(command: string): Promise<string> {
  return new Promise<string>((resolve) => {
    exec(command, (error, stdout) => {
      if (error) {
        resolve("");
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function getStagedGitDiff(repoPath: string): Promise<string> {
  const gitDiff = await runCommand(`cd ${repoPath} && git diff --staged`);
  if (!gitDiff) {
    // If no staged changes, stage all changes and get the diff again
    await runCommand(`cd ${repoPath} && git add .`);
    return runCommand(`cd ${repoPath} && git diff --staged`);
  }
  return gitDiff;
}

export async function commitChanges(repoPath: string, commitMessage: string): Promise<void> {
  await runCommand(`cd ${repoPath} && git commit -m "${commitMessage}"`);
}

export async function getCurrentBranchName(repoPath: string): Promise<string> {
  const branchName = await runCommand(`cd ${repoPath} && git rev-parse --abbrev-ref HEAD`);
  return branchName.trim();
}

export async function getDiffComparedToBranch(repoPath: string, targetBranch: string): Promise<string> {
  const gitDiff = await runCommand(`cd ${repoPath} && git diff ${targetBranch}`);
  return gitDiff;
}

async function isValidRepo(repoPath: string): Promise<boolean> {
  const result = await runCommand(`cd ${repoPath} && git rev-parse --is-inside-work-tree`);
  return result.trim() === "true";
}

export async function getRepoPath(): Promise<string> {
  const preferences = await getPreferenceValues<{ "repo-path": string }>();
  const repoPath = preferences["repo-path"];
  if (!repoPath) {
    throw new Error("No repository path provided.");
  }
  if (!(await isValidRepo(repoPath))) {
    throw new Error("The selected directory is not a valid git repository.");
  }
  return repoPath;
}

async function fetchAllBranches(repoPath: string): Promise<void> {
  await runCommand(`cd ${repoPath} && git fetch --all`);
}

async function getBranchesOutput(repoPath: string): Promise<string> {
  return runCommand(`cd ${repoPath} && git branch -a`);
}

interface Branch {
  name: string;
  isLocal: boolean;
  isActive?: boolean;
}

function parseBranches(branchesOutput: string): Branch[] {
  const branches = branchesOutput
    .split("\n")
    .map((branch) => branch.trim())
    .filter((branch) => branch && !branch.includes(" -> ")); // Exclude symbolic refs

  const remoteBranches = branches
    .filter((branch) => branch.startsWith("remotes/"))
    .map((branch) => branch.replace("remotes/origin/", ""));

  return branches
    .map((branch) => {
      const isActive = branch.startsWith("* "); // Identify active branch
      const name = branch.replace("* ", "").replace("remotes/origin/", "");
      const isLocal = !remoteBranches.includes(name); // Determine if branch is local
      return { name, isLocal, isActive };
    })
    .filter((branch, index, self) => index === self.findIndex((b) => b.name === branch.name)); // Remove duplicates
}

function removeDuplicateBranches(branches: Branch[]): Branch[] {
  const uniqueBranches = Array.from(new Set(branches.map((b) => b.name)))
    .map((name) => branches.find((b) => b.name === name))
    .filter((b): b is Branch => b !== undefined);

  return uniqueBranches;
}

function prioritizeActiveBranch(branches: Branch[]): Branch[] {
  const activeBranchIndex = branches.findIndex((b) => b.isActive);
  if (activeBranchIndex > -1) {
    const [activeBranch] = branches.splice(activeBranchIndex, 1);
    branches.unshift(activeBranch); // Move active branch to the top
  }
  return branches;
}

export async function getBranches(repoPath: string): Promise<Branch[]> {
  await fetchAllBranches(repoPath);
  const branchesOutput = await getBranchesOutput(repoPath);
  const parsedBranches = parseBranches(branchesOutput);
  const uniqueBranches = removeDuplicateBranches(parsedBranches);
  return prioritizeActiveBranch(uniqueBranches);
}

export async function checkoutBranch(repoPath: string, branchName: string): Promise<void> {
  await runCommand(`cd ${repoPath} && git checkout ${branchName}`);
}

export async function cleanupBranches(repoPath: string): Promise<void> {
  const command = `
    cd ${repoPath} &&
    git checkout main &&
    git fetch --prune &&
    git pull &&
    git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -d
  `;
  await runCommand(command);
}

export async function deleteBranch(repoPath: string, branchName: string): Promise<void> {
  // Ensure we're not on the branch we're trying to delete
  const currentBranch = await getCurrentBranchName(repoPath);
  if (currentBranch === branchName) {
    throw new Error("Cannot delete the currently active branch.");
  }

  // Attempt to delete the branch
  const result = await runCommand(`cd ${repoPath} && git branch -d ${branchName}`);

  // If the branch couldn't be deleted, it might not be fully merged
  if (result.includes("error:")) {
    throw new Error(`Failed to delete branch ${branchName}. It may not be fully merged.`);
  }
}
