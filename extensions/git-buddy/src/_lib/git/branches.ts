import { runGitCommand } from "./queue";
import { ERROR_MESSAGES } from "../../_constants";

interface Branch {
  name: string;
  isLocal: boolean;
  isActive?: boolean;
}

async function fetchAllBranches(repoPath: string): Promise<void> {
  await runGitCommand(`git fetch --all`, repoPath);
}

async function getBranchesOutput(repoPath: string): Promise<string> {
  return runGitCommand(`git branch -a`, repoPath);
}

function parseBranches(branchesOutput: string): Branch[] {
  const branches = branchesOutput
    .split("\n")
    .map((branch) => branch.trim())
    .filter((branch) => branch && !branch.includes(" -> "));

  const remoteBranches = branches
    .filter((branch) => branch.startsWith("remotes/"))
    .map((branch) => branch.replace("remotes/origin/", ""));

  return branches
    .map((branch) => {
      const isActive = branch.startsWith("* ");
      const name = branch.replace("* ", "").replace("remotes/origin/", "");
      const isLocal = !remoteBranches.includes(name);
      return { name, isLocal, isActive };
    })
    .filter((branch, index, self) => index === self.findIndex((b) => b.name === branch.name));
}

function removeDuplicateBranches(branches: Branch[]): Branch[] {
  return Array.from(new Set(branches.map((b) => b.name)))
    .map((name) => branches.find((b) => b.name === name))
    .filter((b): b is Branch => b !== undefined);
}

function prioritizeActiveBranch(branches: Branch[]): Branch[] {
  const activeBranchIndex = branches.findIndex((b) => b.isActive);
  if (activeBranchIndex > -1) {
    const [activeBranch] = branches.splice(activeBranchIndex, 1);
    branches.unshift(activeBranch);
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
  await runGitCommand(`git checkout ${branchName}`, repoPath);
}

export async function cleanupBranches(repoPath: string): Promise<void> {
  await runGitCommand(
    `
    git checkout main &&
    git fetch --prune &&
    git pull &&
    git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -d
  `,
    repoPath,
  );
}

export async function deleteBranch(repoPath: string, branchName: string): Promise<void> {
  const currentBranch = await runGitCommand(`git rev-parse --abbrev-ref HEAD`, repoPath);
  if (currentBranch === branchName) {
    throw new Error(ERROR_MESSAGES.ACTIVE_BRANCH_DELETE);
  }

  await runGitCommand(`git branch -D ${branchName}`, repoPath);
}
