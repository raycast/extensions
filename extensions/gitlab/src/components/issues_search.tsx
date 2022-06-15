import { List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Issue } from "../gitlabapi";
import { daysInSeconds, getErrorMessage, hashRecord, showErrorToast } from "../utils";
import { IssueListItem, IssueScope, IssueState } from "./issues";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

export function SearchMyIssues(): JSX.Element {
  const scope = IssueScope.created_by_me;
  const state = IssueState.all;
  const [search, setSearch] = useState<string>();
  const params: Record<string, any> = { state, scope };
  if (search) {
    params.search = search;
  }
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
    }
  );
  if (error) {
    showErrorToast(getErrorMessage(error), "Could not fetch Issues");
  }
  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }
  const title = search ? "Search Results" : "Created Recently";
  return (
    <List isLoading={isLoading} searchText={search} onSearchTextChange={setSearch} throttle>
      <List.Section title={title} subtitle={data ? `${data.length}` : undefined}>
        {data?.map((i) => (
          <IssueListItem key={i.id} issue={i} refreshData={performRefetch} />
        ))}
      </List.Section>
    </List>
  );
}
