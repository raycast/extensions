import { Action, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useMemo } from "react";

import { PullRequestFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import {
  getCheckStateAccessory,
  getNumberOfComments,
  getPullRequestAuthor,
  getPullRequestStatus,
  getReviewDecision,
} from "../helpers/pull-request";
import { useMyPullRequests } from "../hooks/useMyPullRequests";

import PullRequestActions from "./PullRequestActions";
import PullRequestDetail from "./PullRequestDetail";
import { SortActionProps } from "./SortAction";

type PullRequestListItemProps = {
  pullRequest: PullRequestFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList?: MutatePromise<PullRequestFieldsFragment[] | undefined> | ReturnType<typeof useMyPullRequests>["mutate"];
  showAuthor?: boolean;
};

export default function PullRequestListItem({
  pullRequest,
  viewer,
  mutateList,
  sortQuery,
  setSortQuery,
  showAuthor = false,
}: PullRequestListItemProps & SortActionProps) {
  const updatedAt = new Date(pullRequest.updatedAt);

  const numberOfComments = useMemo(() => getNumberOfComments(pullRequest), [pullRequest]);
  const author = showAuthor ? getPullRequestAuthor(pullRequest) : null;
  const status = getPullRequestStatus(pullRequest);
  const reviewDecision = getReviewDecision(pullRequest.reviewDecision);

  const accessories: List.Item.Accessory[] = [
    {
      text: format(updatedAt, "MMM dd"),
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
  ];

  accessories.unshift({
    text: {
      value: `${numberOfComments}`,
      color: numberOfComments > 0 ? Color.PrimaryText : Color.SecondaryText,
    },
    icon: Icon.Bubble,
  });

  accessories.unshift(
    reviewDecision ?? { icon: { source: Icon.Circle, tintColor: Color.SecondaryText }, tooltip: "No review requested" },
  );

  if (pullRequest.repository.autoMergeAllowed && pullRequest.autoMergeRequest) {
    accessories.unshift({ tag: { value: "Auto-merge", color: Color.Yellow } });
  }

  if (pullRequest.commits.nodes) {
    const checkState = pullRequest.commits.nodes[0]?.commit.statusCheckRollup?.state;
    const checkStateAccessory = checkState ? getCheckStateAccessory(checkState) : null;

    if (checkStateAccessory) {
      accessories.unshift(checkStateAccessory);
    }
  }

  if (author) {
    accessories.splice(accessories.length - 1, 0, {
      icon: author.icon,
      tooltip: `Author: ${author.text}`,
    });
  }

  const keywords = [`${pullRequest.number}`];

  if (pullRequest.author?.login) {
    keywords.push(pullRequest.author.login);
  }

  return (
    <List.Item
      key={pullRequest.id}
      title={pullRequest.title}
      subtitle={{ value: `#${pullRequest.number}`, tooltip: `Repository: ${pullRequest.repository.nameWithOwner}` }}
      icon={{ value: status.icon, tooltip: `Status: ${status.text}` }}
      keywords={keywords}
      accessories={accessories}
      actions={
        <PullRequestActions {...{ pullRequest, viewer, mutateList, sortQuery, setSortQuery }}>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<PullRequestDetail initialPullRequest={pullRequest} viewer={viewer} mutateList={mutateList} />}
          />
        </PullRequestActions>
      }
    />
  );
}
