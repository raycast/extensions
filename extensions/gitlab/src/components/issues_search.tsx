import { List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../common";
import { Issue } from "../gitlabapi";
import {
  IssueListEmptyView,
  IssueListItem,
  IssueScope,
  IssueState,
  getIssueQuery,
  injectQueryNamedParameters,
} from "./issues";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SearchMyIssues() {
  const [scope, setScope] = useState<string>(IssueScope.created_by_me);
  const state = IssueState.all;
  const [search, setSearch] = useState<string>("");
  const { data, isLoading, revalidate } = useCachedPromise(
    async (scope: string, state: IssueState, query: string): Promise<Issue[]> => {
      const params: Record<string, any> = { state, scope };
      const parsedQuery = getIssueQuery(query);
      params.search = parsedQuery.query || "";
      injectQueryNamedParameters(params, parsedQuery, scope as IssueScope, false);
      injectQueryNamedParameters(params, parsedQuery, scope as IssueScope, true);
      return gitlab.getIssues(params);
    },
    [scope, state, search],
    { initialData: [] },
  );
  return (
    <List
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" onChange={setScope} storeValue>
          <List.Dropdown.Item title="Created By Me" value={IssueScope.created_by_me} />
          <List.Dropdown.Item title="Assigned To Me" value={IssueScope.assigned_to_me} />
          <List.Dropdown.Item title="All" value={IssueScope.all} />
        </List.Dropdown>
      }
    >
      <List.Section title={search ? "Search Results" : "Created Recently"} subtitle={`${data.length}`}>
        {data.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} refreshData={revalidate} />
        ))}
      </List.Section>
      <IssueListEmptyView />
    </List>
  );
}
