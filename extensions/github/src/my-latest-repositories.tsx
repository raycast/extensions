import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { ExtendedRepositoryFieldsFragment, OrderDirection, RepositoryOrderField } from "./generated/graphql";
import { MY_REPO_DEFAULT_SORT_QUERY, MY_REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyLatestRepositories() {
  const { github } = getGitHubClient();

  const { data: history, visitRepository } = useHistory(undefined, null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", MY_REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-latest-repo",
  });
  const sortTypesData = MY_REPO_SORT_TYPES_TO_QUERIES;

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (sort: string) => {
      const orderByField = sort.split(":")[0].toUpperCase() as RepositoryOrderField;
      const orderByDirection = sort.split(":")[1].toUpperCase() as OrderDirection;
      const result = await github.myLatestRepositories({
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
        orderByField,
        orderByDirection,
      });

      return result.viewer.repositories.nodes?.map((node) => node as ExtendedRepositoryFieldsFragment);
    },
    [sortQuery],
    { keepPreviousData: true },
  );

  const myLatestRepositories = useMemo(
    () => data?.filter((repository) => !history.find((r) => r.id === repository.id)),
    [data],
  );

  return (
    <List isLoading={isLoading} throttle>
      <List.Section title="Visited Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            {...{ repository, mutateList, onVisit: visitRepository, sortQuery, setSortQuery, sortTypesData }}
          />
        ))}
      </List.Section>

      {myLatestRepositories ? (
        <List.Section title="My Latest Repositories" subtitle={`${myLatestRepositories.length}`}>
          {myLatestRepositories.map((repository) => {
            return (
              <RepositoryListItem
                key={repository.id}
                {...{ repository, mutateList, onVisit: visitRepository, sortQuery, setSortQuery, sortTypesData }}
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withGitHubClient(MyLatestRepositories);
