export const WEB_IDES = [
  {
    title: "GitHub Dev",
    baseUrl: "https://github.dev/",
  },
  {
    title: "VSCode Dev",
    baseUrl: "https://vscode.dev/github/",
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
  },
  {
    title: "Repl.it",
    baseUrl: `https://repl.it/github/`,
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
  },
  {
    title: "VSCode Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: "vscode.svg",
  },
];

import { exec } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

import { getErrorMessage } from "./errors";

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

const execAsync = promisify(exec);

export async function cloneAndOpen(repository: ExtendedRepositoryFieldsFragment, clonePath: string, branch?: string) {
  const { application } = getPreferenceValues<Preferences.SearchRepositories>();
  const applicationPath = application?.path.replaceAll(" ", "\\ ");

  const repoName = repository.name;
  let targetDir = path.join(clonePath, repoName);
  let counter = 1;

  while (existsSync(targetDir)) {
    targetDir = path.join(clonePath, `${repoName}-${counter}`);
    counter++;
  }

  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error creating directory",
      message: getErrorMessage(error),
    });
    console.error(error);
    return;
  }

  const openCommand = `open -a ${applicationPath} ${targetDir}`;

  const toast = await showToast({
    title: `Cloning ${repository.nameWithOwner}`,
    message: `to ${targetDir}`,
    style: Toast.Style.Animated,
  });

  const cloneUrl = `https://github.com/${repository.nameWithOwner}`;
  const branchOption = branch ? `-b ${branch}` : "";
  const cloneCommand = `git clone ${branchOption} ${cloneUrl} ${targetDir}`;

  try {
    await execAsync(cloneCommand);
    toast.title = "Repository cloned successfully";
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error while cloning the repository";
    toast.message = getErrorMessage(error);
    console.error(error);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  toast.title = "Opening repository...";

  try {
    await execAsync(openCommand);
    toast.title = "Code editor launched!";
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error while opening the repository";
    toast.message = getErrorMessage(error);
    console.error(error);
  }
}

// History was stored in `LocalStorage` before, after migration it's stored in `Cache`
async function loadVisitedRepositories() {
  const item = await LocalStorage.getItem<string>(VISITED_REPOSITORIES_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as ExtendedRepositoryFieldsFragment[];
  } else {
    return [];
  }
}

export function useHistory(searchText: string | undefined, searchFilter: string | null) {
  const [history, setHistory] = useCachedState<ExtendedRepositoryFieldsFragment[]>("history", []);
  const [migratedHistory, setMigratedHistory] = useCachedState<boolean>("migratedHistory", false);

  useEffect(() => {
    if (!migratedHistory) {
      loadVisitedRepositories().then((repositories) => {
        setHistory(repositories);
        setMigratedHistory(true);
      });
    }
  }, [migratedHistory]);

  function visitRepository(repository: ExtendedRepositoryFieldsFragment) {
    const nextRepositories = [repository, ...(history?.filter((item) => item.id !== repository.id) ?? [])].slice(
      0,
      VISITED_REPOSITORIES_LENGTH,
    );
    setHistory(nextRepositories);
  }

  // Converting query filter string to regexp:
  const repositoryFilter = `${searchFilter?.replaceAll(/org:|user:/g, "").replaceAll(" ", "|")}/.*`;

  const data = history
    .filter((r) => r.nameWithOwner.toLowerCase().includes(searchText?.toLowerCase() ?? ""))
    .filter((r) => r.nameWithOwner.match(repositoryFilter));

  return { data, visitRepository };
}

export const REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Last Update", value: "sort:updated-desc" },
  { title: "Name", value: "sort:name-asc" },
  { title: "Stars", value: "sort:stars-desc" },
  { title: "Forks", value: "sort:forks-desc" },
];
export const MY_REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Last Pushed", value: "pushed_at:desc" },
  { title: "Name", value: "name:asc" },
  { title: "Stars", value: "stargazers:desc" },
];
export const REPO_DEFAULT_SORT_QUERY = REPO_SORT_TYPES_TO_QUERIES[0].value;
export const MY_REPO_DEFAULT_SORT_QUERY = MY_REPO_SORT_TYPES_TO_QUERIES[0].value;
