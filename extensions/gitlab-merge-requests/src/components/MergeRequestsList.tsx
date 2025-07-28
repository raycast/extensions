import { useState, useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { Project } from "../types/gitlab";
import { useMergeRequests } from "../hooks/useGitLab";
import { filterMergeRequests } from "../utils/filters";
import { getStateIcon, formatDate } from "../utils/formatting";
import { generateMergeRequestMarkdown } from "../templates/mergeRequestTemplate";
import { MergeRequestActions } from "./MergeRequestActions";
import { SEARCH_PLACEHOLDERS, NAVIGATION_TITLES, EMPTY_VIEW_MESSAGES } from "../constants/app";

interface MergeRequestsListProps {
  project: Project;
}

export const MergeRequestsList = ({ project }: MergeRequestsListProps) => {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const { data: mergeRequests, isLoading: mrsLoading, error: mrsError } = useMergeRequests(project.id);

  useEffect(() => {
    if (mrsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch merge requests",
        message: mrsError.message,
      });
    }
  }, [mrsError]);

  const filteredMRs = mergeRequests ? filterMergeRequests(mergeRequests, searchText) : [];

  const handleToggleDetail = () => setIsShowingDetail(!isShowingDetail);

  return (
    <List
      isLoading={mrsLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={SEARCH_PLACEHOLDERS.MERGE_REQUESTS}
      navigationTitle={NAVIGATION_TITLES.MERGE_REQUESTS(project.name)}
      isShowingDetail={isShowingDetail}
    >
      {filteredMRs.map((mr) => (
        <List.Item
          key={mr.id}
          title={mr.title}
          subtitle={`!${mr.iid}`}
          accessories={[{ text: formatDate(mr.created_at) }]}
          icon={getStateIcon(mr.state, mr.has_conflicts, mr.draft || mr.work_in_progress)}
          detail={<List.Item.Detail markdown={generateMergeRequestMarkdown(mr)} />}
          actions={
            <MergeRequestActions
              mergeRequest={mr}
              isShowingDetail={isShowingDetail}
              onToggleDetail={handleToggleDetail}
            />
          }
        />
      ))}
      {filteredMRs.length === 0 && !mrsLoading && (
        <List.EmptyView
          title={EMPTY_VIEW_MESSAGES.NO_MERGE_REQUESTS.title}
          description={EMPTY_VIEW_MESSAGES.NO_MERGE_REQUESTS.description}
        />
      )}
    </List>
  );
};
