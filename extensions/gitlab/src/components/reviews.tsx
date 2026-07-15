import { ActionPanel, Color, List } from "@raycast/api";
import { MergeRequest, Project } from "../gitlabapi";
import { useMemo, useState } from "react";
import { MyProjectsDropdown } from "./project";
import {
  MRListDetailsToggleAction,
  MRListMetadataToggleAction,
  MRListItem,
  MRScope,
  MRState,
  useMRListDetails,
} from "./mr";
import { GitLabIcons } from "../icons";
import { ListPagination, usePaginatedMergeRequests } from "./mr_data";

function ReviewListEmptyView() {
  return <List.EmptyView title="No Reviews" icon={{ source: GitLabIcons.review, tintColor: Color.PrimaryText }} />;
}

export function ReviewList() {
  const [project, setProject] = useState<Project>();
  const { mrs, isLoading, performRefetch, pagination } = useMyReviews(project);
  const { isShowingDetail, toggleListDetails } = useMRListDetails();

  return (
    <List
      searchBarPlaceholder="Filter Reviews by name..."
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} storeValue={true} />}
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
      {mrs.map((mergeRequest) => (
        <MRListItem
          key={mergeRequest.id}
          mr={mergeRequest}
          refreshData={performRefetch}
          isShowingDetail={isShowingDetail}
          onToggleListDetails={toggleListDetails}
        />
      ))}
      <ReviewListEmptyView />
    </List>
  );
}

export function useMyReviews(
  project?: Project | undefined,
  labels: string[] | undefined = undefined,
  hideArchived = false,
): {
  mrs: MergeRequest[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
  pagination: ListPagination;
} {
  const {
    mrs: raw,
    isLoading,
    error,
    performRefetch,
    pagination,
  } = usePaginatedMergeRequests({
    cacheKey: `reviews_${project?.id ?? "all"}_${labels ? labels.join(",") : "[]"}_${hideArchived}`,
    buildParams: () => ({
      state: MRState.opened,
      scope: MRScope.reviews_for_me,
      ...(labels && { labels }),
      ...(hideArchived && { non_archived: true }),
    }),
  });
  const mrs = useMemo(
    () => (project ? raw.filter((mergeRequest) => mergeRequest.project_id === project.id) : raw),
    [project, raw],
  );
  return {
    mrs,
    isLoading,
    error,
    performRefetch,
    pagination,
  };
}
