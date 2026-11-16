import { ActionPanel, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { MergeRequest, Project } from "../gitlabapi";
import {
  MRListDetailsToggleAction,
  MRListMetadataToggleAction,
  MRListItem,
  MRScope,
  MRState,
  mrSearchBarPlaceholder,
  useMRListDetails,
} from "./mr";
import { RefreshMergeRequestsAction } from "./mr_actions";
import { ListPagination, usePaginatedMergeRequests } from "./mr_data";
import { MergeRequestFilterSubmenu } from "./mr_filter";
import { MyProjectsDropdown } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MY_MR_SECTION_TITLES: Record<MRScope, string> = {
  [MRScope.all]: "Your Merge Requests",
  [MRScope.created_by_me]: "Your Recently Created Merge Requests",
  [MRScope.assigned_to_me]: "Your assigned Merge Requests",
  [MRScope.reviews_for_me]: "Your Review Merge Requests",
};

function combinedPagination(paginations: ListPagination[]): ListPagination {
  const defined = paginations.filter((pagination): pagination is NonNullable<ListPagination> => pagination != null);
  if (defined.length === 0) {
    return undefined;
  }
  if (defined.length === 1) {
    return defined[0];
  }
  return {
    ...defined[0],
    hasMore: defined.some((pagination) => pagination.hasMore),
    onLoadMore: () => {
      for (const pagination of defined) {
        if (pagination.hasMore) {
          pagination.onLoadMore();
        }
      }
    },
  };
}

function MyMRList(props: {
  mrs: MergeRequest[];
  isLoading: boolean;
  title?: string;
  performRefetch: () => void;
  pagination?: ListPagination;
  searchText?: string | undefined;
  onSearchTextChange?: (text: string) => void;
  scope: MRScope;
  onSelectScope: (scope: MRScope) => void;
  mrState: MRState;
  onSelectState: (state: MRState) => void;
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
          <ActionPanel.Section title="Filters">
            <MergeRequestFilterSubmenu
              scope={props.scope}
              onSelectScope={props.onSelectScope}
              state={props.mrState}
              onSelectState={props.onSelectState}
            />
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
            filterAction={
              <MergeRequestFilterSubmenu
                scope={props.scope}
                onSelectScope={props.onSelectScope}
                state={props.mrState}
                onSelectState={props.onSelectState}
              />
            }
            refreshAction={<RefreshMergeRequestsAction onRefresh={props.performRefetch} />}
          />
        ))}
      </List.Section>
      <List.EmptyView
        title="No Merge Requests"
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <MRListDetailsToggleAction isShowingDetail={isShowingDetail} onToggle={toggleListDetails} />
              <MRListMetadataToggleAction isShowingDetail={isShowingDetail} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Filters">
              <MergeRequestFilterSubmenu
                scope={props.scope}
                onSelectScope={props.onSelectScope}
                state={props.mrState}
                onSelectState={props.onSelectState}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <RefreshMergeRequestsAction onRefresh={props.performRefetch} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
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
  const [mrState, setMrState] = useCachedState<MRState>("mr-my-state", props.state);
  const [scope, setScope] = useCachedState<MRScope>("mr-my-scope", props.scope);
  const includeAuthored = scope === MRScope.all || scope === MRScope.created_by_me;
  const includeAssigned = scope === MRScope.all || scope === MRScope.assigned_to_me;
  const includeReviews = scope === MRScope.all || scope === MRScope.reviews_for_me;
  const authored = useMyMergeRequests(MRScope.created_by_me, mrState, project, undefined, false, includeAuthored);
  const assigned = useMyMergeRequests(MRScope.assigned_to_me, mrState, project, undefined, false, includeAssigned);
  const reviews = useMyMergeRequests(MRScope.reviews_for_me, mrState, project, undefined, false, includeReviews);
  const mrs = useMemo(() => {
    if (scope === MRScope.created_by_me) {
      return authored.mrs;
    }
    if (scope === MRScope.assigned_to_me) {
      return assigned.mrs;
    }
    if (scope === MRScope.reviews_for_me) {
      return reviews.mrs;
    }
    const byId = new Map<number, MergeRequest>();
    for (const mergeRequest of [...authored.mrs, ...assigned.mrs, ...reviews.mrs]) {
      byId.set(mergeRequest.id, mergeRequest);
    }
    return [...byId.values()].sort(
      (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
    );
  }, [assigned.mrs, authored.mrs, reviews.mrs, scope]);
  const isLoading =
    (includeAuthored && authored.isLoading) ||
    (includeAssigned && assigned.isLoading) ||
    (includeReviews && reviews.isLoading);
  const performRefetch = () => {
    if (includeAuthored) {
      authored.performRefetch();
    }
    if (includeAssigned) {
      assigned.performRefetch();
    }
    if (includeReviews) {
      reviews.performRefetch();
    }
  };
  const pagination =
    scope === MRScope.created_by_me
      ? authored.pagination
      : scope === MRScope.assigned_to_me
        ? assigned.pagination
        : scope === MRScope.reviews_for_me
          ? reviews.pagination
          : combinedPagination([authored.pagination, assigned.pagination, reviews.pagination]);
  return (
    <MyMRList
      isLoading={isLoading}
      mrs={mrs}
      title={MY_MR_SECTION_TITLES[scope]}
      performRefetch={performRefetch}
      pagination={pagination}
      searchText={props.searchText}
      onSearchTextChange={props.onSearchTextChange}
      scope={scope}
      onSelectScope={setScope}
      mrState={mrState}
      onSelectState={setMrState}
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
  execute = true,
): {
  mrs: MergeRequest[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  return usePaginatedMergeRequests({
    cacheKey: `mymrs_${scope}_${state}_${project?.id ?? "all"}_${labels ? labels.join(",") : "[]"}_${hideArchived}`,
    buildParams: () => ({
      state,
      scope,
      ...(labels && { labels }),
      ...(hideArchived && { non_archived: true }),
    }),
    project,
    execute,
  });
}
