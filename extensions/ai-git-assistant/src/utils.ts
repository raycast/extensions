import { execSync } from "child_process";
import { AI, environment, FileSystemItem, getSelectedFinderItems, LocalStorage } from "@raycast/api";

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
      return savedRepositoryPath;
    } else {
      throw error;
    }
  }

  const repositoryPath = await findRepositoryPath(items);
  await LocalStorage.setItem("path-to-repo", repositoryPath);
  return repositoryPath;
}

function isGitInstalled() {
  try {
    execSync("git --version");
    return true;
  } catch (error) {
    return false;
  }
}

async function findRepositoryPath(selectedFinderItems: FileSystemItem[]) {
  const gitRepository = selectedFinderItems.find((item) => isGitRepository(item.path));
  if (gitRepository) return gitRepository.path;
  const innerRepository = selectedFinderItems.find((item) => getInnerRepositoryPath(item.path));
  if (innerRepository) return getInnerRepositoryPath(innerRepository.path);
  throw Error("No git repository found");
}

function isGitRepository(path: string) {
  try {
    return Boolean(execSync(`git -C ${path} rev-parse --is-inside-work-tree`).toString().trim());
  } catch (error) {
    return false;
  }
}

export function getInnerRepositoryPath(pathToRepos: string) {
  return execSync(`ls -ltd -d ${pathToRepos}*/.git/ | head -n 1 | rev | cut -d' ' -f1 | rev | xargs dirname`)
    .toString()
    .trim();
}

export function buildInputForAi(repositoryPath: string, prompt: string) {
  const diffOutput = execSync(`git -C ${repositoryPath} diff HEAD`).toString().slice(0, 9000);
  const statusOutput = execSync(`git -C ${repositoryPath} status -uno`);

  return `${prompt}\n\nMy git status is: \n\n${statusOutput}\n\nMy git diff is: \n\n${diffOutput}.\n\n`;
}

export async function generateCommitMessage(repositoryPath: string, prompt: string) {
  if (!environment.canAccess(AI)) {
    throw Error("You don't have access to AI :(");
  }

  const input = buildInputForAi(repositoryPath, prompt);
  return AI.ask(input, { creativity: "none" });
}
