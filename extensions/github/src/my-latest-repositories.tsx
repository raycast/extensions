import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getSearchPageSize } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { OrderDirection, ExtendedRepositoryFieldsFragment, RepositoryOrderField } from "./generated/graphql";
import { compactFragmentNodes, uniqueById } from "./helpers";
import { MY_REPO_DEFAULT_SORT_QUERY, MY_REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyLatestRepositories() {
  const { github } = getGitHubClient();

  const { data: history, visitRepository, updateRepository, removeRepository } = useHistory(undefined, null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", MY_REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-latest-repo",
  });
  const sortTypesData = MY_REPO_SORT_TYPES_TO_QUERIES;

  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (sort: string) =>
      async ({ cursor }) => {
        const orderByField = sort.split(":")[0].toUpperCase() as RepositoryOrderField;
        const orderByDirection = sort.split(":")[1].toUpperCase() as OrderDirection;
        const result = await github.myLatestRepositories({
          numberOfItems: getSearchPageSize(),
          after: cursor,
          orderByField,
          orderByDirection,
        });

        return {
          data: compactFragmentNodes<ExtendedRepositoryFieldsFragment>(result.viewer.repositories.nodes),
          hasMore: result.viewer.repositories.pageInfo.hasNextPage,
          cursor: result.viewer.repositories.pageInfo.endCursor ?? undefined,
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

  const myLatestRepositories = useMemo(
    () => repositories.filter((repository) => !historyIds.has(repository.id)),
    [historyIds, repositories],
  );

  return (
    <List isLoading={isLoading} throttle pagination={pagination}>
      <List.Section title="Visited Repositories" subtitle={validHistory ? String(validHistory.length) : undefined}>
        {validHistory.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            {...{
              repository,
              mutateList,
              onVisit: visitRepository,
              onUpdate: updateRepository,
              onRemove: removeRepository,
              sortQuery,
              setSortQuery,
              sortTypesData,
            }}
          />
        ))}
      </List.Section>

      {data ? (
        <List.Section title="My Latest Repositories" subtitle={`${myLatestRepositories.length}`}>
          {myLatestRepositories.map((repository) => {
            return (
              <RepositoryListItem
                key={repository.id}
                {...{
                  repository,
                  mutateList,
                  onVisit: visitRepository,
                  onUpdate: updateRepository,
                  sortQuery,
                  setSortQuery,
                  sortTypesData,
                }}
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withGitHubClient(MyLatestRepositories);
