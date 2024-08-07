export const WEB_IDES = [
  {
    title: "github.dev",
    baseUrl: "https://github.dev/",
    icon: "github-dev.svg",
  },
  {
    title: "VS Code for the Web",
    baseUrl: "https://vscode.dev/github/",
    icon: "vscode.svg",
  },
  {
    title: "CodeSandbox",
    baseUrl: `https://codesandbox.io/s/github/`,
    icon: "codesandbox.svg",
  },
  {
    title: "Replit",
    baseUrl: `https://repl.it/github/`,
    icon: "replit.svg",
  },
  {
    title: "Gitpod",
    baseUrl: `https://gitpod.io/#https://github.com/`,
    icon: "gitpod.svg",
  },
  {
    title: "Glitch",
    baseUrl: "https://glitch.com/edit/#!/import/github/",
    icon: "glitch.svg",
  },
  {
    title: "Sourcegraph",
    baseUrl: `https://sourcegraph.com/github.com/`,
    icon: "sourcegraph.svg",
  },
  {
    title: "VS Code Remote Repositories",
    baseUrl: "vscode://GitHub.remotehub/open?url=https://github.com/",
    icon: "vscode.svg",
  },
];

import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

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
