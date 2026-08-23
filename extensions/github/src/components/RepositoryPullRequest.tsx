import { Color, List } from "@raycast/api";
import { MutatePromise, useCachedPromise, useCachedState } from "@raycast/utils";
import type { JSX } from "react";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestFieldsFragment } from "../generated/graphql";
import { PR_DEFAULT_SORT_QUERY } from "../helpers/pull-request";

import PullRequestListItem from "./PullRequestListItem";

const PULL_REQUESTS_PAGE_SIZE = 20;

type PullRequestStatusFilter = "open" | "merged" | "draft" | "closed" | "all";

function PullRequestStatusDropdown(props: {
  value: PullRequestStatusFilter;
  onChange: (value: PullRequestStatusFilter) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Status"
      value={props.value}
      onChange={(value) => props.onChange(value as PullRequestStatusFilter)}
    >
      <List.Dropdown.Item
        value="open"
        title="Open"
        icon={{ source: "pull-request-open.svg", tintColor: Color.Green }}
      />
      <List.Dropdown.Item
        value="merged"
        title="Merged"
        icon={{ source: "pull-request-merged.svg", tintColor: Color.Purple }}
      />
      <List.Dropdown.Item
        value="draft"
        title="Draft"
        icon={{ source: "pull-request-draft.svg", tintColor: Color.SecondaryText }}
      />
      <List.Dropdown.Item
        value="closed"
        title="Closed"
        icon={{ source: "pull-request-closed.svg", tintColor: Color.Red }}
      />
      <List.Dropdown.Item
        value="all"
        title="All"
        icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
      />
    </List.Dropdown>
  );
}

export function RepositoryPullRequestList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useCachedState<PullRequestStatusFilter>("status-filter", "open", {
    cacheNamespace: "github-repo-pr",
  });
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", PR_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-repo-pr",
  });
  const statusQuery = statusFilter === "all" ? "" : `is:${statusFilter}`;

  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (repo, query, sortTxt, statusQuery) => async (options: { page: number; cursor?: string }) => {
      const repoFilter = repo && repo.length > 0 ? `repo:${repo}` : "";
      const result = await github.searchPullRequests({
        query: `is:pr ${statusQuery} ${repoFilter} ${sortTxt} archived:false ${query}`.replace(/\s+/g, " ").trim(),
        numberOfItems: PULL_REQUESTS_PAGE_SIZE,
        after: options.page > 0 ? options.cursor : undefined,
      });
      return {
        data:
          result.search.edges
            ?.map((edge) => edge?.node as PullRequestFieldsFragment | null | undefined)
            .filter((node): node is PullRequestFieldsFragment => node != null) ?? [],
        hasMore: result.search.pageInfo.hasNextPage,
        cursor: result.search.pageInfo.endCursor ?? undefined,
      };
    },
    [props.repo, searchText, sortQuery, statusQuery],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      navigationTitle={props.repo}
      throttle
      pagination={pagination}
      searchBarAccessory={<PullRequestStatusDropdown value={statusFilter} onChange={setStatusFilter} />}
    >
      <List.Section title="Pull Requests" subtitle={`${data?.length ?? 0}`}>
        {data?.map((d) => (
          <PullRequestListItem
            key={d.id}
            showAuthor
            pullRequest={d}
            mutateList={mutateList as MutatePromise<PullRequestFieldsFragment[] | undefined>}
            sortQuery={sortQuery}
            setSortQuery={setSortQuery}
          />
        ))}
      </List.Section>
    </List>
  );
}
