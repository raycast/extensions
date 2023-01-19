import React, { useEffect, useState } from "react";
import { ActionPanel, Color, List, showToast, Action, Image, Toast } from "@raycast/api";
import useSWR, { SWRConfig } from "swr";
import { Schema } from "bitbucket";

import { getRepositories, getRepositoriesLazy } from "../../queries";
import { Repository } from "./interface";
import { icon } from "../../helpers/icon";
import { cacheConfig, REPOSITORIES_CACHE_KEY } from "../../helpers/cache";
import { ShowPipelinesActions, ShowPullRequestsActions } from "./actions";

export function SearchRepositories() {
  return (
    <SWRConfig value={cacheConfig}>
      <SearchListLazy />
    </SWRConfig>
  );
}

function SearchList(): JSX.Element {
  const { data, error, isValidating } = useSWR(REPOSITORIES_CACHE_KEY, getRepositories);

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed loading repositories", message: error.message });
  }

  return (
    <List isLoading={isValidating} searchBarPlaceholder="Search by name...">
      <List.Section title="Repositories" subtitle={data?.length.toString()}>
        {data?.map(toRepository).map((repo: Repository) => (
          <SearchListItem key={repo.uuid} repo={repo} />
        ))}
      </List.Section>
    </List>
  );
}

const SearchListLazy: React.FC = () => {
  const [query, setQuery] = useState("");
  const { data, error, isLoading, isValidating } = useSWR<Schema.Repository[]>(
    `/repositories?query=${query}`,
    getRepositoriesLazy
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading repositories",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading || isValidating}
      searchBarPlaceholder="Search by name..."
      onSearchTextChange={setQuery}
      throttle
    >
      <List.Section title="Repositories" subtitle={data?.length.toString()}>
        {data?.map(toRepository).map((repo: Repository) => (
          <SearchListItem key={repo.uuid} repo={repo} />
        ))}
      </List.Section>
    </List>
  );
};

function toRepository(repo: Schema.Repository): Repository {
  return {
    name: repo.name as string,
    uuid: repo.uuid as string,
    slug: repo.slug as string,
    fullName: repo.full_name as string,
    avatarUrl: repo.links?.avatar?.href as string,
    description: (repo.description as string) || "",
    url: `https://bitbucket.org/${repo.full_name}`,
  };
}

function SearchListItem({ repo }: { repo: Repository }): JSX.Element {
  return (
    <List.Item
      title={repo.name}
      subtitle={repo.description}
      icon={{ source: repo.avatarUrl, mask: Image.Mask.RoundedRectangle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browser actions">
            <Action.OpenInBrowser
              title="Open Repository in Browser"
              url={repo.url}
              icon={{ source: icon.code, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Branches in Browser"
              url={repo.url + "/branches"}
              icon={{ source: icon.branch, tintColor: Color.PrimaryText }}
            />
            <Action.OpenInBrowser
              title="Open Pull Requests in Browser"
              url={repo.url + "/pull-requests"}
              icon={{ source: icon.pr, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.OpenInBrowser
              title="Open Pipelines in Browser"
              url={repo.url + "/addon/pipelines/home"}
              icon={{
                source: icon.pipeline.self,
                tintColor: Color.PrimaryText,
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Details">
            <ShowPipelinesActions repo={repo} />
            <ShowPullRequestsActions repo={repo} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
