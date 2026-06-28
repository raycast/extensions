import { execSync } from "child_process";
import { FileSystemItem, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import { Branch } from "../models";

export async function retrieveAndSavePathToRepository(): Promise<string> {
  if (!isGitInstalled()) {
    throw Error("Git is not installed");
  }

  const savedRepositoryPath = await LocalStorage.getItem<string>("path-to-repo");
  let items: FileSystemItem[];

  try {
    items = await getSelectedFinderItems();
  } catch (error) {
    if (savedRepositoryPath) {
      return findRepositoryPath([savedRepositoryPath])[1];
    } else {
      throw error;
    }
  }

  const [initialPath, repositoryPath] = findRepositoryPath(items.map((item) => item.path));
  await LocalStorage.setItem("path-to-repo", initialPath);
  return repositoryPath;
}

function findRepositoryPath(paths: string[]): string[] {
  const gitRepository = paths.find((item) => isGitRepository(item));
  if (gitRepository) return [gitRepository, gitRepository];
  const [initialPath, innerRepository] =
    paths.map((item) => [item, getInnerRepositoryPath(item)]).find(([, path]) => isGitRepository(path)) || [];
  if (initialPath && innerRepository) return [initialPath, innerRepository];
  throw Error("No git repository found");
}

export function getInnerRepositoryPath(pathToRepos: string) {
  return execSync(`ls -ltd -d ${pathToRepos}*/.git/ | head -n 1 | rev | cut -d' ' -f1 | rev | xargs dirname`)
    .toString()
    .trim();
}

export function getListOfBranches(repositoryPath: string) {
  const currentBranch = getCurrentBranchName(repositoryPath);
  return execSync(
    `git -C ${repositoryPath} for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short)||%(committerdate)||%(authorname)'`,
  )
    .toString()
    .trim()
    .split("\n")
    .map((line) => {
      const [name, date, author] = line.split("||");
      return new Branch(name, date, author);
    })
    .filter((branch) => branch.name !== currentBranch);
}

export function getCurrentBranchName(repositoryPath: string) {
  return execSync(`git -C ${repositoryPath} rev-parse --abbrev-ref HEAD`).toString().trim();
}

export function getPrDiff(repositoryPath: string, currentBranch: string, baseBranch: string) {
  return execSync(`git -C ${repositoryPath} log --oneline ${baseBranch}..${currentBranch}`)
    .toString()
    .trim()
    .slice(0, 9000);
}

export function getBranchDiff(repositoryPath: string) {
  return execSync(`git -C ${repositoryPath} diff HEAD`).toString().slice(0, 6500);
}

export function getBranchStatus(repositoryPath: string) {
  return execSync(`git -C ${repositoryPath} status -uno`);
}

export function pathToRepositoryName(path: string | undefined) {
  const name = path
    ?.split("/")
    ?.filter((it) => it.length > 0)
    ?.pop();
  if (name) {
    return capitalizeFirstLetter(name);
  }
  return undefined;
}

function capitalizeFirstLetter(inputString: string): string {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

function isGitRepository(path: string) {
  try {
    return Boolean(execSync(`git -C ${path} rev-parse --is-inside-work-tree`).toString().trim());
  } catch (error) {
    return false;
  }
}

function isGitInstalled() {
  try {
    execSync("git --version");
    return true;
  } catch (error) {
    return false;
  }
}
