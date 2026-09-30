import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getSearchPageSize } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { OrderDirection, ExtendedRepositoryFieldsFragment, StarOrderField } from "./generated/graphql";
import { compactFragmentNodes, uniqueById } from "./helpers";
import { STARRED_REPO_DEFAULT_SORT_QUERY, STARRED_REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyStarredRepositories() {
  const { github } = getGitHubClient();

  const { data: history, visitRepository, updateRepository, removeRepository } = useHistory(undefined, null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", STARRED_REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-starred-repo",
  });
  const sortTypesData = STARRED_REPO_SORT_TYPES_TO_QUERIES;

  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (sort: string) =>
      async ({ cursor }) => {
        const orderByField = sort.split(":")[0].toUpperCase() as StarOrderField;
        const orderByDirection = sort.split(":")[1].toUpperCase() as OrderDirection;
        const result = await github.myStarredRepositories({
          numberOfItems: getSearchPageSize(),
          after: cursor,
          orderByField,
          orderByDirection,
        });
        const starredRepositories = result.viewer.starredRepositories;

        return {
          data: compactFragmentNodes<ExtendedRepositoryFieldsFragment>(starredRepositories.nodes),
          hasMore: starredRepositories.pageInfo.hasNextPage,
          cursor: starredRepositories.pageInfo.endCursor ?? undefined,
        };
      },
    [sortQuery],
    { keepPreviousData: true },
  );

  const repositories = useMemo(() => uniqueById(data ?? []), [data]);
  const repositoryIds = useMemo(() => new Set(repositories.map((repository) => repository.id)), [repositories]);

  useEffect(
    () => history.forEach((repository) => repositories.find((r) => r.id === repository.id && visitRepository(r))),
    [repositories],
  );

  const validHistory = useMemo(
    () => history.filter((repository) => repositoryIds.has(repository.id)),
    [history, repositoryIds],
  );

  const historyIds = useMemo(() => new Set(validHistory.map((repository) => repository.id)), [validHistory]);

  const myStarredRepositories = useMemo(
    () => repositories.filter((repository) => !historyIds.has(repository.id)),
    [historyIds, repositories],
  );

  return (
    <List isLoading={isLoading} throttle pagination={pagination}>
      <List.Section
        title="Visited Starred Repositories"
        subtitle={validHistory ? String(validHistory.length) : undefined}
      >
        {validHistory.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            mutateList={mutateList}
            onVisit={visitRepository}
            onUpdate={updateRepository}
            onRemove={removeRepository}
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
        {myStarredRepositories?.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            mutateList={mutateList}
            onVisit={visitRepository}
            onUpdate={updateRepository}
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
