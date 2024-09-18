import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import { Color, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

import { getErrorMessage } from "./errors";

export const WEB_IDES = [
  {
    title: "github.dev",
    baseUrl: "https://github.dev/",
    icon: { source: "github-dev.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "VS Code for the Web",
    baseUrl: "https://vscode.dev/github/",
    icon: { source: "vscode.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
    icon: { source: "codesandbox.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Replit",
    baseUrl: `https://repl.it/github/`,
    icon: { source: "replit.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
    icon: { source: "gitpod.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
    icon: { source: "glitch.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
    icon: { source: "sourcegraph.svg", tintColor: Color.PrimaryText },
  },
  {
    title: "VS Code Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: { source: "vscode.svg", tintColor: Color.PrimaryText },
  },
];

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

export async function cloneAndOpen(repository: ExtendedRepositoryFieldsFragment) {
  const { application, baseClonePath } = getPreferenceValues<Preferences.SearchRepositories>();
  const applicationPath = application?.path.replaceAll(" ", "\\ ");
  const clonePath = `${baseClonePath}/${repository.nameWithOwner}`;
  const openCommand = `open -a ${applicationPath} ${clonePath}`;

  const toast = await showToast({
    title: `Opening ${repository.nameWithOwner}`,
    message: `at ${clonePath}`,
    style: Toast.Style.Animated,
  });

  if (!existsSync(clonePath.replace("~", homedir()))) {
    const cloneUrl = `https://github.com/${repository.nameWithOwner}`;
    const cloneCommand = `git clone ${cloneUrl} ${clonePath}`;

    try {
      execSync(cloneCommand);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error while cloning the repository";
      toast.message = getErrorMessage(error);
      console.error(error);
      return;
    }
  }

  try {
    execSync(openCommand);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error while opening the repository";
    toast.message = getErrorMessage(error);
    console.error(error);
    return;
  }

  toast.title = "Code editor launched!";
  toast.style = Toast.Style.Success;
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
