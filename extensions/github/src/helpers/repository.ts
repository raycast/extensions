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
    const nextRepositories = [repository, ...(history?.filter((item) => item !== repository) ?? [])].slice(
      0,
      VISITED_REPOSITORIES_LENGTH
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
