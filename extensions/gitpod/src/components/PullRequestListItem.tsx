import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  useNavigation,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useMemo } from "react";

import { UIColors } from "../../constants";
import { WorkspaceManager } from "../api/Gitpod/WorkspaceManager";
import { PullRequestFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import createWorksapceFromContext from "../helpers/createWorkspaceFromContext";
import OpenInGitpod, { getPreferencesForContext } from "../helpers/openInGitpod";
import {
  getCheckStateAccessory,
  getNumberOfComments,
  getPullRequestAuthor,
  getPullRequestStatus,
  getReviewDecision,
} from "../helpers/pull-request";
import ContextPreferences from "../preferences/context_preferences";
import { dashboardPreferences } from "../preferences/dashboard_preferences";

import DefaultOrgForm from "./DefaultOrgForm";

type PullRequestListItemProps = {
  pullRequest: PullRequestFieldsFragment;
  viewer?: UserFieldsFragment;
  changeBodyVisibility?: (state: boolean) => void;
  bodyVisible?: boolean;
  removePullReq?: (PullRequest: PullRequestFieldsFragment) => void;
  visitPullReq?: (pullRequest: PullRequestFieldsFragment) => void;
  fromCache?: boolean;
};

export default function PullRequestListItem({
  pullRequest,
  removePullReq,
  visitPullReq,
  fromCache,
  changeBodyVisibility,
  bodyVisible,
}: PullRequestListItemProps) {
  const updatedAt = new Date(pullRequest.updatedAt);
  const { push } = useNavigation();
  const dashboardPreferences = getPreferenceValues<dashboardPreferences>();

  const numberOfComments = useMemo(() => getNumberOfComments(pullRequest), []);
  const author = getPullRequestAuthor(pullRequest);
  const status = getPullRequestStatus(pullRequest);
  const reviewDecision = getReviewDecision(pullRequest.reviewDecision);

  const { data: preferences, revalidate } = usePromise(async () => {
    const response = await getPreferencesForContext(
      "Pull Request",
      pullRequest.repository.nameWithOwner,
      pullRequest.title
    );
    return response;
  });

  const accessories: List.Item.Accessory[] = [
    {
      date: updatedAt,
      tooltip: `Updated: ${format(updatedAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
    },
    {
      text: {
        value: preferences?.preferredEditorClass === "g1-large" ? "L" : "S",
      },
      icon: {
        source: Icon.ComputerChip,
        tintColor: UIColors.gitpod_gold,
      },
      tooltip: `Editor: ${preferences?.preferredEditor}, Class: ${preferences?.preferredEditorClass} `,
    },
    {
      icon: author.icon,
      tooltip: `Author: ${author.text}`,
    },
  ];

  if (!bodyVisible) {
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
  }

  const keywords = [`${pullRequest.number}`];

  if (pullRequest.author?.login) {
    keywords.push(pullRequest.author.login);
  }

  return (
    <List.Item
      key={pullRequest.id}
      title={!bodyVisible ? pullRequest.title : ""}
      subtitle={{ value: `#${pullRequest.number}`, tooltip: `Repository: ${pullRequest.repository.nameWithOwner}` }}
      icon={{ value: status.icon, tooltip: `Status: ${status.text}` }}
      keywords={keywords}
      detail={<List.Item.Detail markdown={"## " + pullRequest.title + "\n" + pullRequest.body} />}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open PR in Gitpod"
            onAction={async () => {
              visitPullReq?.(pullRequest);
              if (dashboardPreferences.access_token) {
                const defaultOrg = await LocalStorage.getItem("default_organization");
                if (defaultOrg !== undefined && WorkspaceManager.api) {
                  createWorksapceFromContext(defaultOrg.toString(), pullRequest.permalink);
                } else {
                  push(<DefaultOrgForm />);
                }
              } else {
                OpenInGitpod(
                  pullRequest.permalink,
                  "Pull Request",
                  pullRequest.repository.nameWithOwner,
                  pullRequest.title
                );
              }
            }}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action
            title="View PR in GitHub"
            onAction={() => {
              visitPullReq?.(pullRequest);
              open(pullRequest.permalink);
            }}
          />
          {!fromCache && (
            <Action
              title="Add PR to Recents"
              onAction={async () => {
                visitPullReq?.(pullRequest);
                await showToast({
                  title: `Added PR "#${pullRequest.number}" to Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          {fromCache && (
            <Action
              title="Remove from Recents"
              onAction={async () => {
                removePullReq?.(pullRequest);
                await showToast({
                  title: `Removed PR #${pullRequest.number} from Recents`,
                  style: Toast.Style.Success,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          {/* <Action
            title="Configure Workspace"
            onAction={() =>
              push(
                <ContextPreferences
                  revalidate={revalidate}
                  type="Pull Request"
                  repository={pullRequest.repository.nameWithOwner}
                  context={pullRequest.title}
                />
              )
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          /> */}
          {!fromCache && (
            <Action
              title="Show PR Preview"
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={() => {
                if (changeBodyVisibility) {
                  changeBodyVisibility(true);
                }
              }}
            />
          )}
          {!fromCache && (
            <Action
              title="Hide PR Preview"
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={() => {
                if (changeBodyVisibility) {
                  changeBodyVisibility(false);
                }
              }}
            />
          )}
          <Action.Push
            title="Switch Default Organization"
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            target={<DefaultOrgForm />}
          />
        </ActionPanel>
      }
    />
  );
}
