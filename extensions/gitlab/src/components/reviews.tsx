import { ActionPanel, List, showToast, Color, ImageLike, Toast, Image } from "@raycast/api";
import { MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { gitlab } from "../common";
import { useState, useEffect } from "react";
import { daysInSeconds, getErrorMessage } from "../utils";
import { DefaultActions, GitLabOpenInBrowserAction } from "./actions";
import { ShowReviewMRAction } from "./review_actions";
import { useCommitStatus } from "./commits/utils";
import { getCIJobStatusIcon } from "./jobs";
import { useCache } from "../cache";

export function ReviewList(): JSX.Element {
  const { mrs, error, isLoading } = useMyReviews();

  if (error) {
    showToast(Toast.Style.Failure, "Cannot search Reviews", error);
  }

  if (isLoading === undefined) {
    return <List isLoading={true} searchBarPlaceholder="" />;
  }

  return (
    <List searchBarPlaceholder="Filter Reviews by name..." isLoading={isLoading} throttle={true}>
      {mrs?.map((mr) => (
        <ReviewListItem key={mr.id} mr={mr} />
      ))}
    </List>
  );
}

function ReviewListItem(props: { mr: MergeRequest }) {
  const mr = props.mr;
  const { commitStatus: status } = useCommitStatus(mr.project_id, mr.sha);
  const statusIcon: Image.ImageLike | undefined = status?.status ? getCIJobStatusIcon(status.status) : undefined;
  return (
    <List.Item
      id={mr.id.toString()}
      title={mr.title}
      subtitle={"#" + mr.iid}
      icon={{ source: GitLabIcons.mropen, tintColor: Color.Green }}
      accessoryIcon={statusIcon}
      actions={
        <ActionPanel>
          <DefaultActions
            action={<ShowReviewMRAction mr={mr} />}
            webAction={<GitLabOpenInBrowserAction url={mr.web_url} />}
          />
        </ActionPanel>
      }
    />
  );
}

function useMyReviews(): {
  mrs: MergeRequest[] | undefined;
  isLoading: boolean | undefined;
  error: string | undefined;
  performRefetch: () => void;
} {
  const {
    data: mrs,
    isLoading,
    error,
    performRefetch,
  } = useCache<MergeRequest[] | undefined>(
    `myreviews`,
    async (): Promise<MergeRequest[] | undefined> => {
      const user = await gitlab.getMyself();
      const glMRs = await gitlab.getMergeRequests({
        state: "opened",
        reviewer_id: user.id,
        in: "title",
        scope: "all",
      });
      return glMRs;
    },
    {
      deps: [],
      secondsToRefetch: 10,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  return { mrs, isLoading, error, performRefetch };
}
