import { Color, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import type { JSX } from "react";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { IssueFieldsFragment } from "../generated/graphql";
import { uniqueById } from "../helpers";
import { ISSUE_DEFAULT_SORT_QUERY, normalizeIssueSearchText, parseIssueNumberLookup } from "../helpers/issue";

import IssueListItem from "./IssueListItem";

const ISSUES_PAGE_SIZE = 20;

type IssueStatusFilter = "open" | "closed" | "all";

function IssueStatusDropdown(props: { value: IssueStatusFilter; onChange: (value: IssueStatusFilter) => void }) {
  return (
    <List.Dropdown
      tooltip="Status"
      value={props.value}
      onChange={(value) => props.onChange(value as IssueStatusFilter)}
    >
      <List.Dropdown.Item value="open" title="Open" icon={{ source: "issue-open.svg", tintColor: Color.Green }} />
      <List.Dropdown.Item
        value="closed"
        title="Closed"
        icon={{ source: "issue-closed.svg", tintColor: Color.Purple }}
      />
      <List.Dropdown.Item value="all" title="All" icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }} />
    </List.Dropdown>
  );
}

export function RepositoryIssueList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useCachedState<IssueStatusFilter>("status-filter", "open", {
    cacheNamespace: "github-repo-issue",
  });
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", ISSUE_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-repo-issue",
  });
  const repoFilter = props.repo && props.repo.length > 0 ? `repo:${props.repo}` : "";

  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (searchText, sortTxt, statusFilter) => async (options: { page: number; cursor?: string }) => {
      const statusQuery = statusFilter === "all" ? "" : `is:${statusFilter}`;
      const lookup = parseIssueNumberLookup(searchText, props.repo);
      if (lookup && options.page === 0) {
        try {
          const exact = await github.issueByNumber(lookup);
          const issue = exact.repository?.issue;
          const matchesStatus = statusFilter === "all" || (statusFilter === "closed" ? issue?.closed : !issue?.closed);
          if (issue && matchesStatus) {
            return {
              data: [issue as IssueFieldsFragment],
              hasMore: false,
            };
          }
        } catch {
          // Fall back to search when the repository is inaccessible.
        }
      }

      const result = await github.searchIssues({
        query: `is:issue ${statusQuery} ${sortTxt} ${repoFilter} ${normalizeIssueSearchText(searchText)}`
          .replace(/\s+/g, " ")
          .trim(),
        numberOfItems: ISSUES_PAGE_SIZE,
        after: options.page > 0 ? options.cursor : undefined,
      });
      return {
        data: result.search.nodes?.map((node) => node as IssueFieldsFragment) ?? [],
        hasMore: result.search.pageInfo.hasNextPage,
        cursor: result.search.pageInfo.endCursor ?? undefined,
      };
    },
    [searchText, sortQuery, statusFilter],
  );
  const issues = uniqueById(data ?? []);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      navigationTitle={props.repo}
      searchBarPlaceholder="Filter by title or #123"
      throttle
      pagination={pagination}
      searchBarAccessory={<IssueStatusDropdown value={statusFilter} onChange={setStatusFilter} />}
    >
      <List.Section title="Issues" subtitle={`${issues.length}`}>
        {issues.map((d) => (
          <IssueListItem
            key={d.id}
            issue={d}
            mutateList={mutateList}
            sortQuery={sortQuery}
            setSortQuery={setSortQuery}
          />
        ))}
      </List.Section>
    </List>
  );
}
