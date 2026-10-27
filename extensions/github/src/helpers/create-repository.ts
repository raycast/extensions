import { getPreferenceValues } from "@raycast/api";

import { getGitHubClient } from "../api/githubClient";

import { getErrorMessage } from "./errors";

export type CreateRepositoryParams = {
  name: string;
  description?: string;
  isPrivate: boolean;
  owner: string;
  autoInit: boolean;
};

export async function getViewerLogin() {
  const { octokit } = getGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}

/**
 * Create a repository for the authenticated user, or in an organization when `owner` is not the viewer.
 */
export async function createRepository({ name, description, isPrivate, owner, autoInit }: CreateRepositoryParams) {
  const { octokit } = getGitHubClient();
  const viewerLogin = await getViewerLogin();
  const params = { name, description: description || undefined, private: isPrivate, auto_init: autoInit };

  try {
    const { data } =
      owner.toLowerCase() === viewerLogin.toLowerCase()
        ? await octokit.repos.createForAuthenticatedUser(params)
        : await octokit.repos.createInOrg({ org: owner, ...params });

    return data;
  } catch (error) {
    throw new Error(getCreateRepositoryErrorMessage(error, name, owner));
  }
}

export function getCloneUrl(repository: { clone_url: string; ssh_url: string }) {
  const { repositoryCloneProtocol } = getPreferenceValues<Preferences>();
  return repositoryCloneProtocol === "ssh" ? repository.ssh_url : repository.clone_url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCreateRepositoryErrorMessage(error: any, name: string, owner: string) {
  const details: string | undefined = error?.response?.data?.errors?.[0]?.message;

  switch (error?.status) {
    case 422:
      if (details?.includes("already exists")) {
        return `A repository named "${name}" already exists on ${owner}`;
      }
      return details ?? `Invalid repository name "${name}"`;
    case 403:
      return `You don't have permission to create repositories on ${owner}`;
    case 404:
      return `Owner "${owner}" not found, or you are not a member of it`;
    default:
      return getErrorMessage(error);
  }
}
