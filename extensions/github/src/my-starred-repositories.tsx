import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { ExtendedRepositoryFieldsFragment, OrderDirection, StarOrderField } from "./generated/graphql";
import { STARRED_REPO_DEFAULT_SORT_QUERY, STARRED_REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyStarredRepositories() {
  const { github } = getGitHubClient();

  const { data: history, visitRepository } = useHistory(undefined, null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", STARRED_REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-starred-repo",
  });
  const sortTypesData = STARRED_REPO_SORT_TYPES_TO_QUERIES;

  const [allRepositories, setAllRepositories] = useState<ExtendedRepositoryFieldsFragment[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isPendingMutation, setIsPendingMutation] = useState(false);

  const { data, isLoading, mutate } = useCachedPromise(
    async (sort: string, afterCursor: string | null) => {
      const orderByField = sort.split(":")[0].toUpperCase() as StarOrderField;
      const orderByDirection = sort.split(":")[1].toUpperCase() as OrderDirection;
      const perPage = getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 });

      const result = await github.myStarredRepositories({
        numberOfItems: perPage,
        after: afterCursor,
        orderByField,
        orderByDirection,
      });

      const repos = result.viewer.starredRepositories.nodes as ExtendedRepositoryFieldsFragment[];
      const pageInfo = result.viewer.starredRepositories.pageInfo;

      return {
        repositories: repos,
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
      };
    },
    [sortQuery, cursor],
    {
      keepPreviousData: true,
      onData: (result) => {
        // Skip onData updates during mutations to avoid conflicts
        if (isPendingMutation) {
          return;
        }

        if (cursor === null) {
          // Initial load or sort change
          setAllRepositories(result.repositories);
        } else {
          // Pagination - append new data
          setAllRepositories((prev) => [...prev, ...result.repositories]);
        }
        setHasMore(result.hasNextPage);
      },
    },
  );

  // Reset pagination when sort changes
  useEffect(() => {
    setAllRepositories([]);
    setCursor(null);
    setHasMore(true);
  }, [sortQuery]);

  useEffect(
    () => history.forEach((repository) => allRepositories?.find((r) => r.id === repository.id && visitRepository(r))),
    [allRepositories],
  );

  const validHistory = useMemo(
    () => history.filter((repository) => allRepositories?.find((r) => r.id === repository.id)),
    [allRepositories, history],
  );

  const myStarredRepositories = useMemo(
    () => allRepositories?.filter((repository) => !validHistory.find((r) => r.id === repository.id)),
    [allRepositories, validHistory],
  );

  const handleLoadMore = () => {
    if (hasMore && !isLoading && data?.endCursor) {
      setCursor(data.endCursor);
    }
  };

  const mutateList = useCallback(async () => {
    setIsPendingMutation(true);
    try {
      setCursor(null);
      setAllRepositories([]);
      setHasMore(true);
      await mutate();
    } finally {
      setIsPendingMutation(false);
    }
  }, [mutate]);
  const isInitialLoading = isLoading && allRepositories.length === 0;

  return (
    <List
      isLoading={isInitialLoading}
      throttle
      pagination={{
        onLoadMore: handleLoadMore,
        hasMore: hasMore,
        pageSize: 1,
      }}
    >
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
