import { Color, List } from "@raycast/api";
import { MergeRequest, Project } from "../gitlabapi";
import { getListDetailsPreference, gitlab } from "../common";
import { daysInSeconds, showErrorToast } from "../utils";
import { useCache } from "../cache";
import { useEffect, useState } from "react";
import { MyProjectsDropdown } from "./project";
import { MRListItem } from "./mr";
import { useCachedState } from "@raycast/utils";
import { GitLabIcons } from "../icons";

function ReviewListEmptyView() {
  return <List.EmptyView title="No Reviews" icon={{ source: GitLabIcons.review, tintColor: Color.PrimaryText }} />;
}

export function ReviewList() {
  const [project, setProject] = useState<Project>();
  const { mrs, error, isLoading, performRefetch } = useMyReviews(project);

  if (error) {
    showErrorToast(error, "Cannot search Reviews");
  }

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  const [expandDetails, setExpandDetails] = useCachedState("expand-details", true);

  return (
    <List
      searchBarPlaceholder="Filter Reviews by name..."
      isLoading={isLoading}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
      isShowingDetail={getListDetailsPreference()}
    >
      {mrs?.map((mr) => (
        <MRListItem
          key={mr.id}
          mr={mr}
          refreshData={performRefetch}
          expandDetails={expandDetails}
          onToggleDetails={() => setExpandDetails(!expandDetails)}
        />
      ))}
      <ReviewListEmptyView />
    </List>
  );
}

export function useMyReviews(
  project?: Project | undefined,
  labels: string[] | undefined = undefined,
): {
  mrs: MergeRequest[] | undefined;
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
} {
  const [mrs, setMrs] = useState<MergeRequest[]>();
  const { data, isLoading, error, performRefetch } = useCache<MergeRequest[] | undefined>(
    `myreviews_${labels ? labels.join(",") : "[]"}`,
    async (): Promise<MergeRequest[] | undefined> => {
      const user = await gitlab.getMyself();
      return await gitlab.getMergeRequests({
        state: "opened",
        reviewer_id: user.id,
        in: "title",
        scope: "all",
        ...(labels && { labels }),
      });
    },
    {
      deps: [labels],
      secondsToRefetch: 5,
      secondsToInvalid: daysInSeconds(7),
    },
  );
  useEffect(() => {
    const filtered = project ? data?.filter((m) => m.project_id === project?.id) : data;
    setMrs(filtered || []);
  }, [data, project]);
  return { mrs, isLoading, error, performRefetch };
}
