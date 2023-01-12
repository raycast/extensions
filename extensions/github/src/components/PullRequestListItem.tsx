import { Action, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useMemo } from "react";

import { MyPullRequestsQuery, PullRequestFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import {
  getCheckStateAccessory,
  getNumberOfComments,
  getPullRequestAuthor,
  getPullRequestStatus,
  getReviewDecision,
} from "../helpers/pull-request";

import PullRequestActions from "./PullRequestActions";
import PullRequestDetail from "./PullRequestDetail";

type PullRequestListItemProps = {
  pullRequest: PullRequestFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList: MutatePromise<MyPullRequestsQuery | undefined> | MutatePromise<PullRequestFieldsFragment[] | undefined>;
};

export default function PullRequestListItem({ pullRequest, viewer, mutateList }: PullRequestListItemProps) {
  const updatedAt = new Date(pullRequest.updatedAt);

  const numberOfComments = useMemo(() => getNumberOfComments(pullRequest), []);
  const author = getPullRequestAuthor(pullRequest);
  const status = getPullRequestStatus(pullRequest);
  const reviewDecision = getReviewDecision(pullRequest.reviewDecision);

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      icon: author.icon,
      tooltip: `Author: ${author.text}`,
    },
  ];

  if (reviewDecision) {
    accessories.unshift(reviewDecision);
  }

  if (numberOfComments > 0) {
    accessories.unshift({
      text: `${numberOfComments}`,
      icon: Icon.Bubble,
    });
  }

  if (pullRequest.commits.nodes) {
    const checkState = pullRequest.commits.nodes[0]?.commit.statusCheckRollup?.state;
    const checkStateAccessory = checkState ? getCheckStateAccessory(checkState) : null;

    if (checkStateAccessory) {
      accessories.unshift(checkStateAccessory);
    }
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
        <PullRequestActions pullRequest={pullRequest} viewer={viewer} mutateList={mutateList}>
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
