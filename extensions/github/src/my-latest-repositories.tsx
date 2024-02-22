import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import RepositoryListItem from "./components/RepositoryListItem";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function MyLatestRepositories() {
  const { github } = getGitHubClient();

  const { data: history, visitRepository } = useHistory(undefined, null);

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async () => {
      const result = await github.myLatestRepositories({
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
      });

      return result.viewer.repositories.nodes?.map((node) => node as ExtendedRepositoryFieldsFragment);
    },
    [],
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
            repository={repository}
            onVisit={visitRepository}
            mutateList={mutateList}
          />
        ))}
      </List.Section>

      {myLatestRepositories ? (
        <List.Section title="My Latest Repositories" subtitle={`${myLatestRepositories.length}`}>
          {myLatestRepositories.map((repository) => {
            return (
              <RepositoryListItem
                key={repository.id}
                repository={repository}
                mutateList={mutateList}
                onVisit={visitRepository}
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withGitHubClient(MyLatestRepositories);
