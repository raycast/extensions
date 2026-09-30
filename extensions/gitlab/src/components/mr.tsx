import { ActionPanel, List, Color, Detail, Action, Image, Icon, Keyboard } from "@raycast/api";
import { Group, MergeRequest, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hashRecord, optimizeMarkdownText, Query, tokenizeQueryText } from "../utils";
import { discussionLabelFromMergeRequest } from "./mr_discussions";
import { getMRStateListIcon } from "./mr_status";
import {
  MRCopySection,
  EditMRAction,
  MRItemActions,
  ShowMRCommitsAction,
  ShowMRDiscussionsAction,
  ShowMRPipelinesAction,
} from "./mr_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { getCIJobStatusIcon, getMRPipelineStatusTooltip } from "./jobs";
import { MRDetailMetadata, MRListDetailMetadata } from "./mr_metadata";
import { useCachedState, usePromise } from "@raycast/utils";
import { fetchMergeRequestGqlByProjectIdIid, fetchMergeRequestGqlByProjectIid } from "./mr_gql";
import { usePaginatedMergeRequests } from "./mr_data";

/* eslint-disable @typescript-eslint/no-explicit-any */

export enum MRScope {
  created_by_me = "created_by_me",
  assigned_to_me = "assigned_to_me",
  reviews_for_me = "reviews_for_me",
  all = "all",
}

export enum MRState {
  opened = "opened",
  closed = "closed",
  locked = "locked",
  merged = "merged",
  all = "all",
}

export const mrListDetailsShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };
export const mrListMetadataShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "i" };

export const mrSearchBarPlaceholder = "Search by title, description, author, id";

export function useMRListDetails(): { isShowingDetail: boolean; toggleListDetails: () => void } {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("mr-list-details", false);
  const toggleListDetails = useCallback(() => setIsShowingDetail((current) => !current), [setIsShowingDetail]);
  return {
    isShowingDetail,
    toggleListDetails,
  };
}

export function useMRListMetadata(): { isShowingMetadata: boolean; toggleListMetadata: () => void } {
  const [isShowingMetadata, setIsShowingMetadata] = useCachedState("mr-list-metadata", true);
  const toggleListMetadata = useCallback(() => setIsShowingMetadata((current) => !current), [setIsShowingMetadata]);
  return {
    isShowingMetadata,
    toggleListMetadata,
  };
}

export function MRListDetailsToggleAction(props: { isShowingDetail: boolean; onToggle: () => void }) {
  return (
    <Action
      title={props.isShowingDetail ? "Hide Side Panel" : "Show Side Panel"}
      shortcut={mrListDetailsShortcut}
      icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
      onAction={props.onToggle}
    />
  );
}

export function MRListMetadataToggleAction(props: { isShowingDetail: boolean }) {
  const { isShowingMetadata, toggleListMetadata } = useMRListMetadata();
  if (!props.isShowingDetail) {
    return null;
  }
  return (
    <Action
      title={isShowingMetadata ? "Hide Metadata" : "Show Metadata"}
      shortcut={mrListMetadataShortcut}
      icon={isShowingMetadata ? Icon.EyeDisabled : Icon.AppWindowList}
      onAction={toggleListMetadata}
    />
  );
}

export function MRDetailFetch(props: { project: Project; mrId: number }) {
  const { mr, isLoading, revalidate } = useMR(props.project, props.mrId);
  if (isLoading || !mr) {
    return <Detail isLoading={isLoading} />;
  } else {
    return <MRDetail mr={mr} onDataChange={revalidate} />;
  }
}

function mrDescriptionMarkdown(mr: MergeRequest, lineBreak = "  \n"): string {
  return [
    `## ${mr.title}`,
    optimizeMarkdownText(mr.description || "<no description>", mr.project_web_url, mr.project_id),
  ].join(lineBreak);
}

export function MRDetail(props: { mr: MergeRequest; onDataChange?: () => void }) {
  const [mergeRequest, setMergeRequest] = useState(props.mr);

  useEffect(() => {
    setMergeRequest(props.mr);
  }, [props.mr]);

  const refreshMergeRequest = useCallback(async () => {
    const updated = await fetchMergeRequestGqlByProjectIdIid(mergeRequest.project_id, mergeRequest.iid);
    setMergeRequest(updated);
    props.onDataChange?.();
  }, [mergeRequest.project_id, mergeRequest.iid, props.onDataChange]);

  const markdown = useMemo(() => mrDescriptionMarkdown(mergeRequest), [mergeRequest]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${mergeRequest.reference_full}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction url={mergeRequest.web_url} />
            <EditMRAction mr={mergeRequest} onUpdated={refreshMergeRequest} />
            <ShowMRCommitsAction mr={mergeRequest} />
            <ShowMRPipelinesAction mr={mergeRequest} />
            <ShowMRDiscussionsAction mr={mergeRequest} />
          </ActionPanel.Section>
          <MRCopySection mr={mergeRequest} />
          <MRItemActions mr={mergeRequest} onDataChange={refreshMergeRequest} />
        </ActionPanel>
      }
      metadata={<MRDetailMetadata mr={mergeRequest} discussionLabel={discussionLabelFromMergeRequest(mergeRequest)} />}
    />
  );
}

export function MRListDetail(props: { mr: MergeRequest }) {
  const { isShowingMetadata } = useMRListMetadata();
  const markdown = useMemo(() => mrDescriptionMarkdown(props.mr, "\n"), [props.mr]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        isShowingMetadata ? (
          <MRListDetailMetadata mr={props.mr} discussionLabel={discussionLabelFromMergeRequest(props.mr)} />
        ) : undefined
      }
    />
  );
}

export function buildMRListParams(query: string | undefined, scope: MRScope, state: MRState): Record<string, any> {
  const parsedQuery = getMRQuery(query);
  const params: Record<string, any> = {
    state,
    scope,
    search: parsedQuery.query || "",
    in: "title",
  };
  injectMRQueryNamedParameters(params, parsedQuery, scope, false);
  injectMRQueryNamedParameters(params, parsedQuery, scope, true);
  return params;
}

interface MRListProps {
  scope: MRScope;
  state?: MRState;
  project?: Project;
  group?: Group;
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}

export function MRList({
  scope = MRScope.created_by_me,
  state = MRState.all,
  project = undefined,
  group = undefined,
  searchBarAccessory = undefined,
}: MRListProps) {
  const [searchText, setSearchText] = useState<string>();
  const params = useMemo(() => buildMRListParams(searchText, scope, state), [searchText, scope, state]);
  const { mrs, isLoading, performRefetch, pagination } = usePaginatedMergeRequests({
    cacheKey: `mrlist_${project?.id ?? "none"}_${group?.id ?? "none"}_${hashRecord(params)}`,
    buildParams: () => params,
    project,
    group,
  });

  const { isShowingDetail, toggleListDetails } = useMRListDetails();

  return (
    <List
      searchBarPlaceholder={mrSearchBarPlaceholder}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      pagination={pagination}
      throttle={true}
      searchBarAccessory={searchBarAccessory}
      navigationTitle={
        group ? `Group MRs ${group.full_path}` : project ? `MRs ${project.name_with_namespace}` : undefined
      }
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MRListDetailsToggleAction isShowingDetail={isShowingDetail} onToggle={toggleListDetails} />
            <MRListMetadataToggleAction isShowingDetail={isShowingDetail} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section
        title={scope == MRScope.assigned_to_me ? "Your Merge Requests" : "Created Recently"}
        subtitle={mrs.length.toString()}
      >
        {mrs.map((mergeRequest) => (
          <MRListItem
            key={mergeRequest.id}
            mr={mergeRequest}
            refreshData={performRefetch}
            isShowingDetail={isShowingDetail}
            onToggleListDetails={toggleListDetails}
          />
        ))}
      </List.Section>
      <MRListEmptyView />
    </List>
  );
}

export function MRListEmptyView() {
  return <List.EmptyView title="No Merge Requests" />;
}

export function MRListItem(props: {
  mr: MergeRequest;
  refreshData: () => void;
  isShowingDetail: boolean;
  onToggleListDetails: () => void;
  showCIStatus?: boolean;
  showAuthor?: boolean;
  filterAction?: React.ReactNode;
  sortAction?: React.ReactNode;
  refreshAction?: React.ReactNode;
}) {
  if (!props.mr) {
    return null;
  }
  const showAuthor = props.showAuthor !== false;
  const accessoryIcon: Image.ImageLike | undefined = showAuthor
    ? { source: props.mr.author?.avatar_url || "", mask: Image.Mask.Circle }
    : undefined;

  const accessories = useMemo((): List.Item.Accessory[] => {
    const discussionLabel = !props.isShowingDetail ? discussionLabelFromMergeRequest(props.mr) : undefined;
    const items: List.Item.Accessory[] = [];
    if (!props.isShowingDetail) {
      items.push(
        ...(props.mr.has_conflicts
          ? [
              {
                tag: { value: "Conflicts", color: Color.Red },
                icon: { source: Icon.Warning, tintColor: Color.Red },
                tooltip: "You should resolve merge conflict before merge",
              },
            ]
          : []),
        ...(discussionLabel
          ? [
              {
                tag: { value: discussionLabel },
                icon: { source: Icon.SpeechBubble, tintColor: Color.PrimaryText },
                tooltip: "Resolved discussions",
              },
            ]
          : []),
        ...(props.mr.approvals_count && props.mr.approvals_count > 0
          ? [
              {
                tag: { value: `${props.mr.approvals_count}`, color: Color.Green },
                icon: { source: Icon.ThumbsUpFilled, tintColor: Color.Green },
                tooltip: "Approvals",
              },
            ]
          : []),
      );
    }
    if ((props.showCIStatus === undefined || props.showCIStatus === true) && props.mr.head_pipeline?.status) {
      items.push({
        icon: getCIJobStatusIcon(props.mr.head_pipeline.status, false),
        tooltip: getMRPipelineStatusTooltip(props.mr.head_pipeline.status),
      });
    }
    if (!props.isShowingDetail && showAuthor && accessoryIcon) {
      items.push({ icon: accessoryIcon, tooltip: props.mr.author?.name });
    }
    if (!props.isShowingDetail) {
      items.push(
        {
          icon: props.mr.merge_when_pipeline_succeeds && props.mr.state === "opened" ? Icon.Rewind : undefined,
          tooltip: props.mr.merge_when_pipeline_succeeds && props.mr.state === "opened" ? "Auto Merge" : undefined,
        },
        ...(props.mr.milestone?.title ? [{ tag: props.mr.milestone.title, tooltip: "Milestone" }] : []),
      );
    }
    return items;
  }, [props.isShowingDetail, props.mr, props.showCIStatus, showAuthor]);

  return (
    <List.Item
      id={props.mr.id.toString()}
      title={props.mr.title}
      icon={getMRStateListIcon(props.mr.state)}
      accessories={accessories}
      detail={props.isShowingDetail && <MRListDetail mr={props.mr} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
              title="Show Details"
              target={<MRDetail mr={props.mr} onDataChange={props.refreshData} />}
            />
            <GitLabOpenInBrowserAction url={props.mr.web_url} />
            <EditMRAction mr={props.mr} onUpdated={props.refreshData} />
            <ShowMRCommitsAction mr={props.mr} />
            <ShowMRPipelinesAction mr={props.mr} />
            <ShowMRDiscussionsAction mr={props.mr} />
            <MRListDetailsToggleAction isShowingDetail={props.isShowingDetail} onToggle={props.onToggleListDetails} />
            <MRListMetadataToggleAction isShowingDetail={props.isShowingDetail} />
          </ActionPanel.Section>
          <MRCopySection mr={props.mr} showCopyMarkdown />
          <MRItemActions
            mr={props.mr}
            onDataChange={props.refreshData}
            todoShortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          {(props.filterAction || props.sortAction) && (
            <ActionPanel.Section title="Filters">
              {props.filterAction}
              {props.sortAction}
            </ActionPanel.Section>
          )}
          {props.refreshAction && <ActionPanel.Section>{props.refreshAction}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}

export function getMRQuery(query: string | undefined) {
  return tokenizeQueryText(query, [
    "label",
    "author",
    "milestone",
    "assignee",
    "draft",
    "target-branch",
    "reviewer",
    "state",
  ]);
}

function isValidMRState(texts: string[] | undefined) {
  if (!texts) {
    return false;
  }
  for (const stateText of texts) {
    if (
      ![
        MRState.closed.valueOf(),
        MRState.opened.valueOf(),
        MRState.locked.valueOf,
        MRState.merged.valueOf,
        MRState.all.valueOf(),
      ].includes(stateText)
    ) {
      return false;
    }
  }
  return true;
}

export function injectMRQueryNamedParameters(
  requestParams: Record<string, any>,
  query: Query,
  scope: MRScope,
  isNegative: boolean,
) {
  const namedParams = isNegative ? query.negativeNamed : query.named;
  for (const extraParam of Object.keys(namedParams)) {
    const extraParamVal = namedParams[extraParam];
    const prefixed = (text: string): string => {
      return isNegative ? `not[${text}]` : text;
    };
    if (extraParamVal) {
      switch (extraParam) {
        case "label":
          {
            requestParams[prefixed("labels")] = extraParamVal.join(",");
          }
          break;
        case "author":
          {
            if (scope === MRScope.all) {
              requestParams[prefixed("author_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "milestone":
          {
            requestParams[prefixed("milestone")] = extraParamVal.join(",");
          }
          break;
        case "assignee":
          {
            if (scope === MRScope.all) {
              requestParams[prefixed("assignee_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "draft":
          {
            requestParams[prefixed("wip")] = extraParamVal.join(",").toLocaleLowerCase();
          }
          break;
        case "target-branch":
          {
            requestParams[prefixed("target_branch")] = extraParamVal.join(",");
          }
          break;
        case "reviewer":
          {
            requestParams[prefixed("reviewer_username")] = extraParamVal.join(",");
          }
          break;
        case "state":
          {
            if (isValidMRState(extraParamVal)) {
              requestParams[prefixed("state")] = extraParamVal.join(",");
            }
          }
          break;
      }
    }
  }
}

export function useMR(
  project: Project,
  mrIID: number,
): {
  mr?: MergeRequest;
  isLoading: boolean;
  revalidate: () => void;
} {
  const { data, isLoading, revalidate } = usePromise(
    (proj: Project, iid: number) => fetchMergeRequestGqlByProjectIid(proj, iid),
    [project, mrIID],
  );

  return { mr: data, isLoading, revalidate };
}
