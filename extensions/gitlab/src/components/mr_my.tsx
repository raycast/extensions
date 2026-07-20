import { ActionPanel, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { MergeRequest, Project } from "../gitlabapi";
import {
  MRListDetailsToggleAction,
  MRListMetadataToggleAction,
  MRListEmptyView,
  MRListItem,
  MRScope,
  MRState,
  mrSearchBarPlaceholder,
  useMRListDetails,
} from "./mr";
import { RefreshMergeRequestsAction } from "./mr_actions";
import { ListPagination, usePaginatedMergeRequests } from "./mr_data";
import { MyProjectsDropdown } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any */

function MyMRList(props: {
  mrs: MergeRequest[];
  isLoading: boolean;
  title?: string;
  performRefetch: () => void;
  pagination?: ListPagination;
  searchText?: string | undefined;
  onSearchTextChange?: (text: string) => void;
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}) {
  const { isShowingDetail, toggleListDetails } = useMRListDetails();

  return (
    <List
      searchBarPlaceholder={mrSearchBarPlaceholder}
      isLoading={props.isLoading}
      pagination={props.pagination}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      searchBarAccessory={props.searchBarAccessory}
      isShowingDetail={isShowingDetail}
      throttle
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MRListDetailsToggleAction isShowingDetail={isShowingDetail} onToggle={toggleListDetails} />
            <MRListMetadataToggleAction isShowingDetail={isShowingDetail} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshMergeRequestsAction onRefresh={props.performRefetch} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title={props.title} subtitle={props.mrs.length.toString()}>
        {props.mrs.map((mergeRequest) => (
          <MRListItem
            key={mergeRequest.id}
            mr={mergeRequest}
            refreshData={props.performRefetch}
            showCIStatus={true}
            showAuthor={false}
            isShowingDetail={isShowingDetail}
            onToggleListDetails={toggleListDetails}
            refreshAction={<RefreshMergeRequestsAction onRefresh={props.performRefetch} />}
          />
        ))}
      </List.Section>
      <MRListEmptyView />
    </List>
  );
}

export function MyMergeRequests(props: {
  scope: MRScope;
  state: MRState;
  searchText?: string | undefined;
  onSearchTextChange?: (text: string) => void;
}) {
  const [project, setProject] = useState<Project>();
  const { mrs: raw, isLoading, performRefetch, pagination } = useMyMergeRequests(props.scope, props.state, project);
  const mrs = useMemo(
    () => (project ? raw.filter((mergeRequest) => mergeRequest.project_id === project.id) : raw),
    [project, raw],
  );
  return (
    <MyMRList
      isLoading={isLoading}
      mrs={mrs}
      title={
        props.scope == MRScope.assigned_to_me ? "Your assigned Merge Requests" : "Your Recently Created Merge Requests"
      }
      performRefetch={performRefetch}
      pagination={pagination}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}

export function useMyMergeRequests(
  scope: MRScope,
  state: MRState,
  project: Project | undefined,
  labels: string[] | undefined = undefined,
  hideArchived = false,
): {
  mrs: MergeRequest[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  // `project` is intentionally excluded from the cache key; the project filter is
  // applied client-side in `MyMergeRequests` against the (global) fetched pages.
  return usePaginatedMergeRequests({
    cacheKey: `mymrs_${scope}_${state}_${labels ? labels.join(",") : "[]"}_${hideArchived}`,
    buildParams: () => ({
      state,
      scope,
      ...(labels && { labels }),
      ...(hideArchived && { non_archived: true }),
    }),
  });
}
