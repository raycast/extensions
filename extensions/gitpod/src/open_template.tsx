import { List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";

import TemplateListEmptyView from "./components/TemplateListEmptyView";
import TemplateListItem from "./components/TemplateListItem";
import { getGitHubClient } from "./helpers/withGithubClient";

type TemplateRepositoryFieldsFragment = {
  name: string;
  url: string;
  id: string;
  stargazerCount: number;
  owner: { name?: string | null; login?: string; avatarUrl: string };
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
};

export default function SearchTemplateRepositories() {
  const { github } = getGitHubClient();

  const [searchText, setSearchText] = useState("");

  const query = useMemo(() => `topic:template org:gitpod-samples ${searchText}`, [searchText]);

  const { data, isLoading } = useCachedPromise(
    async (query) => {
      const result = await github.searchTemplateRepositories({ query, numberOfItems: 10 });
      return result.search.repos?.map((node) => node?.repo as TemplateRepositoryFieldsFragment);
    },
    [query],
    {
      keepPreviousData: true,
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in public and private repositories"
      onSearchTextChange={setSearchText}
      throttle
    >
      {data?.length && data?.length > 0 ? (
        <List.Section title={"Find your favorite template"} subtitle={`${data.length}`}>
          {data.map((repository: TemplateRepositoryFieldsFragment) => {
            return <TemplateListItem key={repository?.id} repository={repository} />;
          })}
        </List.Section>
      ) : null}
      <TemplateListEmptyView searchText={searchText} isLoading={isLoading} sampleRepositories={data} />
    </List>
  );
}
