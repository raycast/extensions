import { List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Issue } from "../gitlabapi";
import { daysInSeconds, getErrorMessage, hashRecord, showErrorToast } from "../utils";
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
  const [search, setSearch] = useState<string>();
  const params: Record<string, any> = { state, scope };
  const qd = getIssueQuery(search);
  params.search = qd.query || "";
  injectQueryNamedParameters(params, qd, scope as IssueScope, false);
  injectQueryNamedParameters(params, qd, scope as IssueScope, true);

  const paramsHash = hashRecord(params);
  const { data, isLoading, error, performRefetch } = useCache<Issue[] | undefined>(
    `myissuessearch_${paramsHash}`,
    async (): Promise<Issue[] | undefined> => {
      return await gitlab.getIssues(params);
    },
    {
      deps: [scope, state, search],
      secondsToRefetch: 1,
      secondsToInvalid: daysInSeconds(7),
    },
  );
  if (error) {
    showErrorToast(getErrorMessage(error), "Could not fetch Issues");
  }
  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }
  const title = search ? "Search Results" : "Created Recently";
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
      <List.Section title={title} subtitle={data ? `${data.length}` : undefined}>
        {data?.map((i) => (
          <IssueListItem key={i.id} issue={i} refreshData={performRefetch} />
        ))}
      </List.Section>
      <IssueListEmptyView />
    </List>
  );
}
