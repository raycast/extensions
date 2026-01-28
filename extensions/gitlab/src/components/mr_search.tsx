import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { useCache } from "../cache";
import { getListDetailsPreference, gitlab } from "../common";
import { MergeRequest } from "../gitlabapi";
import { daysInSeconds, getErrorMessage, hashRecord, showErrorToast } from "../utils";
import { MRScope, MRState, MRListItem, getMRQuery, injectMRQueryNamedParameters, MRListEmptyView } from "./mr";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SearchMyMergeRequests() {
  const [scope, setScope] = useState<string>(MRScope.created_by_me);
  const state = MRState.all;
  const [search, setSearch] = useState<string>();
  const params: Record<string, any> = { state, scope };
  const qd = getMRQuery(search);
  params.search = qd.query || "";
  injectMRQueryNamedParameters(params, qd, scope as MRScope, false);
  injectMRQueryNamedParameters(params, qd, scope as MRScope, true);
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
    },
  );
  if (error) {
    showErrorToast(getErrorMessage(error), "Could not fetch Merge Requests");
  }
  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  const title = search ? "Search Results" : "Created Recently";
  const [expandDetails, setExpandDetails] = useCachedState("expand-details", true);

  return (
    <List
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      isShowingDetail={getListDetailsPreference()}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" onChange={setScope}>
          <List.Dropdown.Item title="Created by Me" value={MRScope.created_by_me} />
          <List.Dropdown.Item title="Assigned to Me" value={MRScope.assigned_to_me} />
          <List.Dropdown.Item title="All" value={MRScope.all} />
        </List.Dropdown>
      }
    >
      <List.Section title={title} subtitle={data ? `${data.length}` : undefined}>
        {data?.map((m) => (
          <MRListItem
            key={m.id}
            mr={m}
            refreshData={performRefetch}
            showCIStatus={true}
            expandDetails={expandDetails}
            onToggleDetails={() => setExpandDetails(!expandDetails)}
          />
        ))}
      </List.Section>
      <MRListEmptyView />
    </List>
  );
}
