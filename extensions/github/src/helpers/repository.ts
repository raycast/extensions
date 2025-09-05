import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

import { Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

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

const VISITED_REPOSITORIES_LENGTH = 25;

export async function cloneAndOpen(repository: ExtendedRepositoryFieldsFragment) {
  const { application, baseClonePath, repositoryCloneProtocol } = getPreferenceValues<Preferences.SearchRepositories>();
  const applicationPath = application?.path.replaceAll(" ", "\\ ");
  const clonePath = `${baseClonePath}/${repository.name}`;
  const openCommand = `open -a ${applicationPath} ${clonePath}`;

  const toast = await showToast({
    title: `Opening ${repository.name}`,
    message: `at ${clonePath}`,
    style: Toast.Style.Animated,
  });

  if (!existsSync(clonePath.replace("~", homedir()))) {
    const cloneCommand = buildCloneCommand(repository.nameWithOwner, repositoryCloneProtocol);

    try {
      execSync(cloneCommand, { cwd: baseClonePath });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error while cloning the repository";
      toast.message = getErrorMessage(error);
      console.error(error);
      return;
    }
  }

  try {
    execSync(openCommand, { cwd: baseClonePath });
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

export function useHistory(searchText: string | undefined, searchFilter: string | null) {
  const [history, setHistory] = useCachedState<ExtendedRepositoryFieldsFragment[]>("history", []);

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
export const STARRED_REPO_SORT_TYPES_TO_QUERIES = [
  { title: "Recently Starred", value: "starred_at:desc" },
  { title: "Oldest Starred", value: "starred_at:asc" },
];
export const REPO_DEFAULT_SORT_QUERY = REPO_SORT_TYPES_TO_QUERIES[0].value;
export const MY_REPO_DEFAULT_SORT_QUERY = MY_REPO_SORT_TYPES_TO_QUERIES[0].value;
export const STARRED_REPO_DEFAULT_SORT_QUERY = STARRED_REPO_SORT_TYPES_TO_QUERIES[0].value;

export const ACCEPTABLE_CLONE_PROTOCOLS = ["https", "ssh"] as const;
export type AcceptableCloneProtocol = (typeof ACCEPTABLE_CLONE_PROTOCOLS)[number];
export const CLONE_PROTOCOLS_TO_LABELS = {
  https: "HTTPS",
  ssh: "SSH",
} as const satisfies Record<AcceptableCloneProtocol, string>;

/**
 * Format the clone command based on specified protocol.
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param cloneProtocol {AcceptableCloneProtocol} Clone protocol
 * @returns {string} Executable clone command
 */
export const buildCloneCommand = (
  repoNameWithOwner: string,
  cloneProtocol: AcceptableCloneProtocol,
  options?: Partial<AdditionalCloneFormatOptions>,
): string => {
  const gitFlag = options?.gitFlags?.join(" ") ?? "";
  const targetDir = options?.targetDir ?? "";

  const cloneUrl = formatRepositoryUrl(repoNameWithOwner, cloneProtocol);
  return `git clone ${gitFlag} ${cloneUrl} "${targetDir}"`;
};

type AdditionalCloneFormatOptions = {
  /**
   * Target directory for the cloned repository.
   */
  targetDir: string;
  /**
   * Additional git flags to be passed to the clone command.
   *
   * Elements will join with a space.
   *
   * @example ["--depth", "1", "-b", "main"]
   */
  gitFlags: string[];
};

/**
 * Format the repository URL based on specified protocol.
 * @param repoNameWithOwner {string} Repository name with owner.
 * @param protocol {"https" | "ssh"} Git protocol
 * @returns {string} Formatted repository URL
 */
const formatRepositoryUrl = (repoNameWithOwner: string, protocol: "https" | "ssh"): string =>
  protocol === "https" ? `https://github.com/${repoNameWithOwner}.git` : `git@github.com:${repoNameWithOwner}.git`;

/**
 * Get the repository filter string based on the filter mode, repository list, and selected repository.
 *
 * @param {Preferences.MyIssues["repositoryFilterMode"]} filterMode - The mode to filter repositories ("all", "include", or "exclude").
 * @param {string[]} repositoryList - The list of repositories to include or exclude.
 * @param {string | null} selectedRepository - The selected repository to filter.
 * @returns {string} The repository filter string.
 */
export function getRepositoryFilter(
  filterMode: Preferences.MyIssues["repositoryFilterMode"],
  repositoryList: string[],
  selectedRepository: string | null,
) {
  if (selectedRepository) {
    return `repo:${selectedRepository}`;
  }

  const list = repositoryList.filter(Boolean);
  return filterMode === "all"
    ? ""
    : filterMode === "exclude"
      ? list.map((repo) => `-repo:${repo}`).join(" ")
      : list.map((repo) => `repo:${repo}`).join(" ");
}
