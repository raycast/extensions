import { List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { MergeRequest } from "../gitlabapi";
import { daysInSeconds, getErrorMessage, hashRecord, showErrorToast } from "../utils";
import { MRScope, MRState, MRListItem } from "./mr";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SearchMyMergeRequests(): JSX.Element {
  const scope = MRScope.created_by_me;
  const state = MRState.all;
  const [search, setSearch] = useState<string>();
  const params: Record<string, any> = { state, scope };
  if (search) {
    params.search = search;
  }
  const paramsHash = hashRecord(params);
  const { data, isLoading, error, performRefetch } = useCache<MergeRequest[] | undefined>(
    `mymrssearch_${paramsHash}`,
    async (): Promise<MergeRequest[] | undefined> => {
      return await gitlab.getMergeRequests(params);
    },
    {
      deps: [scope, state, search],
      secondsToRefetch: 1,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  if (error) {
    showErrorToast(getErrorMessage(error), "Could not fetch Merge Requests");
  }
  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }
  const title = search ? "Search Results" : "Created Recently";
  return (
    <List isLoading={isLoading} searchText={search} onSearchTextChange={setSearch} throttle>
      <List.Section title={title} subtitle={data ? `${data.length}` : undefined}>
        {data?.map((m) => (
          <MRListItem key={m.id} mr={m} refreshData={performRefetch} showCIStatus={true} />
        ))}
      </List.Section>
    </List>
  );
}
