import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { STARRED_REPO_DEFAULT_SORT_QUERY, STARRED_REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyStarredRepositories() {
  const { octokit } = getGitHubClient();

  const { data: history, visitRepository } = useHistory(undefined, null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", STARRED_REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-starred-repo",
  });
  const sortTypesData = STARRED_REPO_SORT_TYPES_TO_QUERIES;

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (sort: string) => {
      const direction = sort.split(":")[1] === "desc" ? "desc" : "asc";
      const perPage = getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 });

      // Get authenticated user's starred repositories
      const sortField = sortQuery.split(":")[0];
      const response = await octokit.rest.activity.listReposStarredByAuthenticatedUser({
        sort: sortField as "created" | "updated",
        direction: direction as "asc" | "desc",
        per_page: perPage,
      });

      return response.data.map((item) => {
        // Handle different response structures
        // The API can return either a Repository or a StarredRepositoryEdge
        // When using the 'application/vnd.github.star+json' media type, the response includes a 'repo' property
        const repo =
          "repo" in item && typeof item === "object" && item !== null && "repo" in item
            ? (item as { repo: typeof item }).repo
            : item;
        return {
          id: repo.node_id,
          name: repo.name,
          nameWithOwner: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stargazerCount: repo.stargazers_count,
          viewerHasStarred: true, // Always true for user's own starred repos
          updatedAt: repo.updated_at || new Date().toISOString(),
          pushedAt: repo.pushed_at || new Date().toISOString(),
          primaryLanguage: repo.language ? { name: repo.language, color: null } : null,
          owner: {
            login: repo.owner.login,
            avatarUrl: repo.owner.avatar_url,
          },
          isPrivate: repo.private,
          isArchived: repo.archived,
          isFork: repo.fork,
          hasIssuesEnabled: repo.has_issues,
          hasWikiEnabled: repo.has_wiki,
          hasProjectsEnabled: repo.has_projects,
          hasDiscussionsEnabled: false,
          releases: { totalCount: 0 },
          mergeCommitAllowed: true,
          squashMergeAllowed: true,
          rebaseMergeAllowed: true,
        };
      }) as ExtendedRepositoryFieldsFragment[];
    },
    [sortQuery],
    { keepPreviousData: true },
  );

  const myStarredRepositories = useMemo(
    () => data?.filter((repository: ExtendedRepositoryFieldsFragment) => !history.find((r) => r.id === repository.id)),
    [data, history],
  );

  return (
    <List isLoading={isLoading} throttle>
      <List.Section title="Visited Starred Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            mutateList={mutateList}
            onVisit={visitRepository}
            sortQuery={sortQuery}
            setSortQuery={setSortQuery}
            sortTypesData={sortTypesData}
          />
        ))}
      </List.Section>

      <List.Section
        title="My Starred Repositories"
        subtitle={myStarredRepositories ? String(myStarredRepositories.length) : undefined}
      >
        {myStarredRepositories?.map((repository: ExtendedRepositoryFieldsFragment) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            mutateList={mutateList}
            onVisit={visitRepository}
            sortQuery={sortQuery}
            setSortQuery={setSortQuery}
            sortTypesData={sortTypesData}
          />
        ))}
      </List.Section>
    </List>
  );
}

export default withGitHubClient(MyStarredRepositories);
