import { ActionPanel, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { hashRecord } from "../utils";
import { Project } from "../gitlabapi";
import {
  MRScope,
  MRState,
  MRListItem,
  MRListDetailsToggleAction,
  MRListMetadataToggleAction,
  mrSearchBarPlaceholder,
  buildMRListParams,
  useMRListDetails,
} from "./mr";
import { RefreshMergeRequestsAction } from "./mr_actions";
import { usePaginatedMergeRequests } from "./mr_data";
import { appendMROrderByParams, MergeRequestSortSubmenu, MR_DEFAULT_ORDER_BY, MRSearchOrderBy } from "./mr_sort";
import { MergeRequestFilterSubmenu } from "./mr_filter";
import { MyProjectsDropdown, useMyProjects } from "./project";

const MR_STATE_FILTERS: { state: MRState; title: string }[] = [
  { state: MRState.opened, title: "Open" },
  { state: MRState.merged, title: "Merged" },
  { state: MRState.closed, title: "Closed" },
];

const MR_SCOPE_LABELS: Record<Exclude<MRScope, MRScope.all>, string> = {
  [MRScope.created_by_me]: "created by me",
  [MRScope.assigned_to_me]: "assigned to me",
  [MRScope.reviews_for_me]: "reviews for me",
};

const MR_SORT_LABELS: Record<Exclude<MRSearchOrderBy, "default">, string> = {
  created_at: "created",
  updated_at: "updated",
  merged_at: "merged",
  title: "title",
  priority: "priority",
  label_priority: "label priority",
  milestone_due: "milestone due",
  popularity: "popularity",
};

function buildMRSearchSectionTitle(
  mrState: MRState,
  scope: MRScope,
  draftOnly: boolean,
  orderBy: MRSearchOrderBy,
): string | undefined {
  if (mrState === MRState.all && scope === MRScope.all && !draftOnly && orderBy === MR_DEFAULT_ORDER_BY) {
    return undefined;
  }

  const stateTitle =
    mrState !== MRState.all
      ? `Only ${(MR_STATE_FILTERS.find((filter) => filter.state === mrState)?.title ?? mrState).toLowerCase()} MRs`
      : "MRs";
  const draftSuffix = draftOnly ? " (+drafts)" : "";
  const scopeSuffix = scope !== MRScope.all ? ` ${MR_SCOPE_LABELS[scope]}` : "";
  const sortSuffix =
    orderBy !== MR_DEFAULT_ORDER_BY
      ? `, sorted by ${MR_SORT_LABELS[orderBy as Exclude<MRSearchOrderBy, "default">]}`
      : "";

  return `${stateTitle}${draftSuffix}${scopeSuffix}${sortSuffix}`;
}

function MergeRequestFilterActions(props: {
  mrState: MRState;
  onSelectState: (state: MRState) => void;
  scope: MRScope;
  onSelectScope: (scope: MRScope) => void;
  draftOnly: boolean;
  onToggleDraftOnly: () => void;
  orderBy: MRSearchOrderBy;
  onSelectOrderBy: (orderBy: MRSearchOrderBy) => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <ActionPanel.Section title="Filters">
        <MergeRequestFilterSubmenu
          scope={props.scope}
          onSelectScope={props.onSelectScope}
          state={props.mrState}
          onSelectState={props.onSelectState}
          draftOnly={props.draftOnly}
          onToggleDraftOnly={props.onToggleDraftOnly}
        />
        <MergeRequestSortSubmenu orderBy={props.orderBy} onSelect={props.onSelectOrderBy} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <RefreshMergeRequestsAction onRefresh={props.onRefresh} />
      </ActionPanel.Section>
    </>
  );
}

function SearchMergeRequestsEmptyView(props: {
  mrState: MRState;
  onSelectState: (state: MRState) => void;
  scope: MRScope;
  onSelectScope: (scope: MRScope) => void;
  draftOnly: boolean;
  onToggleDraftOnly: () => void;
  orderBy: MRSearchOrderBy;
  onSelectOrderBy: (orderBy: MRSearchOrderBy) => void;
  onRefresh: () => void;
  isShowingDetail: boolean;
  onToggleListDetails: () => void;
}) {
  return (
    <List.EmptyView
      title="No Merge Requests"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MRListDetailsToggleAction isShowingDetail={props.isShowingDetail} onToggle={props.onToggleListDetails} />
            <MRListMetadataToggleAction isShowingDetail={props.isShowingDetail} />
          </ActionPanel.Section>
          <MergeRequestFilterActions
            mrState={props.mrState}
            onSelectState={props.onSelectState}
            scope={props.scope}
            onSelectScope={props.onSelectScope}
            draftOnly={props.draftOnly}
            onToggleDraftOnly={props.onToggleDraftOnly}
            orderBy={props.orderBy}
            onSelectOrderBy={props.onSelectOrderBy}
            onRefresh={props.onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

export function SearchMyMergeRequests(props: { project?: Project } = {}) {
  const [project, setProject] = props.project
    ? useState<Project | undefined>(props.project)
    : useCachedState<Project | undefined>("mr-search-project", undefined);

  const { projects: myprojects } = useMyProjects("", !props.project);
  const [mrState, setMrState] = useCachedState<MRState>("mr-search-state", MRState.opened);
  const [scope, setScope] = useCachedState<MRScope>("mr-search-scope", MRScope.all);
  const [orderBy, setOrderBy] = useCachedState<MRSearchOrderBy>("mr-search-order-by", MR_DEFAULT_ORDER_BY);
  const [draftOnly, setDraftOnly] = useCachedState("mr-search-draft-only", false);
  const [search, setSearch] = useState<string>("");
  const { isShowingDetail, toggleListDetails } = useMRListDetails();
  const toggleDraftOnly = () => setDraftOnly((current) => !current);

  useEffect(() => {
    if (!myprojects.length || project !== undefined) {
      return;
    }
    setProject(myprojects[0]);
  }, [myprojects, project, setProject]);

  const params = useMemo(() => {
    const requestParams = buildMRListParams(search, scope, mrState);
    appendMROrderByParams(requestParams, orderBy);
    if (!draftOnly) {
      requestParams.wip = "no";
    }
    return requestParams;
  }, [draftOnly, mrState, scope, orderBy, search]);
  const {
    mrs: data,
    isLoading,
    performRefetch,
    pagination,
  } = usePaginatedMergeRequests({
    cacheKey: `mymrssearch_${project?.id ?? "none"}_${hashRecord(params)}`,
    buildParams: () => params,
    project: project,
    execute: !!project,
    keepPreviousData: true,
  });
  const sectionTitle = useMemo(
    () => buildMRSearchSectionTitle(mrState, scope, draftOnly, orderBy),
    [draftOnly, mrState, orderBy, scope],
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder={mrSearchBarPlaceholder}
      isShowingDetail={isShowingDetail}
      throttle
      searchBarAccessory={
        <MyProjectsDropdown
          value={project ? `${project.id}` : undefined}
          includeAllItem={false}
          onChange={(nextProject) => {
            setProject((current) => (current?.id === nextProject?.id ? current : nextProject));
          }}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MRListDetailsToggleAction isShowingDetail={isShowingDetail} onToggle={toggleListDetails} />
            <MRListMetadataToggleAction isShowingDetail={isShowingDetail} />
          </ActionPanel.Section>
          <MergeRequestFilterActions
            mrState={mrState}
            onSelectState={setMrState}
            scope={scope}
            onSelectScope={setScope}
            draftOnly={draftOnly}
            onToggleDraftOnly={toggleDraftOnly}
            orderBy={orderBy}
            onSelectOrderBy={setOrderBy}
            onRefresh={performRefetch}
          />
        </ActionPanel>
      }
    >
      <List.Section title={sectionTitle}>
        {data.map((mergeRequest) => (
          <MRListItem
            key={mergeRequest.id}
            mr={mergeRequest}
            refreshData={performRefetch}
            showCIStatus={true}
            isShowingDetail={isShowingDetail}
            onToggleListDetails={toggleListDetails}
            filterAction={
              <MergeRequestFilterSubmenu
                scope={scope}
                onSelectScope={setScope}
                state={mrState}
                onSelectState={setMrState}
                draftOnly={draftOnly}
                onToggleDraftOnly={toggleDraftOnly}
              />
            }
            sortAction={<MergeRequestSortSubmenu orderBy={orderBy} onSelect={setOrderBy} />}
            refreshAction={<RefreshMergeRequestsAction onRefresh={performRefetch} />}
          />
        ))}
      </List.Section>
      <SearchMergeRequestsEmptyView
        mrState={mrState}
        onSelectState={setMrState}
        scope={scope}
        onSelectScope={setScope}
        draftOnly={draftOnly}
        onToggleDraftOnly={toggleDraftOnly}
        orderBy={orderBy}
        onSelectOrderBy={setOrderBy}
        onRefresh={performRefetch}
        isShowingDetail={isShowingDetail}
        onToggleListDetails={toggleListDetails}
      />
    </List>
  );
}
