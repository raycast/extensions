import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "../api/githubClient";

const BRANCHES_PAGE_SIZE = 100;
// The API returns branches alphabetically, so stop after 300 instead of walking every page.
const MAX_BRANCH_PAGES = 3;

export function useRepositoryBranches(repository?: string) {
  const { octokit } = getGitHubClient();
  const [owner, name] = (repository ?? "").split("/");

  return useCachedPromise(
    async (owner: string, name: string) => {
      const listBranches = async () => {
        const branches: string[] = [];

        for (let page = 1; page <= MAX_BRANCH_PAGES; page++) {
          const { data } = await octokit.repos.listBranches({
            owner,
            repo: name,
            per_page: BRANCHES_PAGE_SIZE,
            page,
          });
          branches.push(...data.map((branch) => branch.name));

          if (data.length < BRANCHES_PAGE_SIZE) {
            break;
          }
        }

        return branches;
      };

      const branchList = listBranches().catch((error) => {
        // Empty repositories reject branch listing with 409; they have no branches to offer.
        if ((error as { status?: number }).status === 409) {
          return [];
        }

        throw error;
      });

      const [{ data }, branches] = await Promise.all([octokit.repos.get({ owner, repo: name }), branchList]);
      const defaultBranch = data.default_branch;

      return {
        branches: [defaultBranch, ...branches.filter((branch) => branch !== defaultBranch)],
        defaultBranch,
      };
    },
    [owner, name],
    { execute: Boolean(owner && name) },
  );
}

export function useRepositoryBranchSearch(repository: string | undefined, query: string) {
  const { github } = getGitHubClient();
  const [owner, name] = (repository ?? "").split("/");
  const trimmed = query.trim();

  return useCachedPromise(
    async (owner: string, name: string, query: string) => {
      const result = await github.searchRepositoryBranches({ owner, name, query });
      return (result.repository?.refs?.nodes ?? []).flatMap((node) => (node?.name ? [node.name] : []));
    },
    [owner, name, trimmed],
    { execute: Boolean(owner && name && trimmed) },
  );
}
