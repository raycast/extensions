import { Action, ActionPanel, Color, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import {
  MergeableState,
  MergeStateStatus,
  PullRequestDetailsFieldsFragment,
  PullRequestFieldsFragment,
  PullRequestMergeMethod,
  UserFieldsFragment,
} from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";
import { PR_SORT_TYPES_TO_QUERIES } from "../helpers/pull-request";
import { getGitHubUser } from "../helpers/users";
import { useMyPullRequests } from "../hooks/useMyPullRequests";

import AddPullRequestReview from "./AddPullRequestReview";
import PullRequestCommits from "./PullRequestCommits";
import { SortAction, SortActionProps } from "./SortAction";

export type PullRequest =
  | PullRequestFieldsFragment
  | PullRequestDetailsFieldsFragment
  | (PullRequestDetailsFieldsFragment & PullRequestFieldsFragment);

type PullRequestActionsProps = {
  pullRequest: PullRequest;
  viewer?: UserFieldsFragment;
  mutateList?: MutatePromise<PullRequestFieldsFragment[] | undefined> | ReturnType<typeof useMyPullRequests>["mutate"];
  mutateDetail?: MutatePromise<PullRequest>;
  children?: React.ReactNode;
};

export default function PullRequestActions({
  pullRequest,
  viewer,
  mutateList,
  mutateDetail,
  children,
  sortQuery,
  setSortQuery,
}: PullRequestActionsProps & SortActionProps) {
  const { github } = getGitHubClient();

  async function mutate() {
    if (mutateList) {
      await mutateList();
    }

    if (mutateDetail) {
      await mutateDetail();
    }
  }

  async function reopenPullRequest() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Reopening pull request #${pullRequest.number}` });

      await github.reopenPullRequest({ nodeId: pullRequest.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Pull request #${pullRequest.number} is now open`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed reopening pull request",
        message: getErrorMessage(error),
      });
    }
  }

  async function closePullRequest() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Closing pull request #${pullRequest.number}` });

      await github.closePullRequest({ nodeId: pullRequest.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Pull request #${pullRequest.number} closed`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed closing pull request",
        message: getErrorMessage(error),
      });
    }
  }

  async function mergePullRequest(method: PullRequestMergeMethod) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Merging pull request #${pullRequest.number}` });

      await github.mergePullRequest({ nodeId: pullRequest.id, method });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Pull request #${pullRequest.number} merged`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed merging pull request",
        message: getErrorMessage(error),
      });
    }
  }

  async function addPullRequestToMergeQueue() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Adding pull request #${pullRequest.number} to merge queue`,
      });

      await github.addPullRequestToMergeQueue({ nodeId: pullRequest.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Pull request #${pullRequest.number} added to merge queue`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed adding pull request to merge queue",
        message: getErrorMessage(error),
      });
    }
  }

  async function removePullRequestFromMergeQueue() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Removing pull request #${pullRequest.number} from merge queue`,
      });

      await github.removePullRequestFromMergeQueue({ nodeId: pullRequest.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Pull request #${pullRequest.number} removed from merge queue`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed removing pull request from merge queue",
        message: getErrorMessage(error),
      });
    }
  }

  async function enableAutoMerge() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Enabling auto-merge for pull request #${pullRequest.number}`,
      });

      await github.enablePullRequestAutoMerge({ nodeId: pullRequest.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Auto-merge enabled for pull request #${pullRequest.number}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed enabling auto-merge",
        message: getErrorMessage(error),
      });
    }
  }

  async function disableAutoMerge() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Disabling auto-merge for pull request #${pullRequest.number}`,
      });

      await github.disablePullRequestAutoMerge({ nodeId: pullRequest.id });

      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: `Auto-merge disabled for pull request #${pullRequest.number}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed disabling auto-merge",
        message: getErrorMessage(error),
      });
    }
  }

  async function assignToMe(id: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Assigning to me" });

      const assigneeIds = (pullRequest.assignees.nodes
        ?.filter((assignee) => !!assignee)
        .map((assignee) => assignee?.id) ?? []) as string[];

      await github.changePullRequestAssignees({
        pullRequestId: pullRequest.id,
        assigneeIds: [...assigneeIds, id],
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Assigned to me",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed assigning to me",
        message: getErrorMessage(error),
      });
    }
  }

  async function unassignFromMe(id: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Un-assigning from me" });

      const assigneeIds = (pullRequest.assignees.nodes
        ?.filter((assignee) => !!assignee)
        .map((assignee) => assignee?.id) ?? []) as string[];

      await github.changePullRequestAssignees({
        pullRequestId: pullRequest.id,
        assigneeIds: assigneeIds?.filter((assigneeId) => assigneeId !== id),
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Un-assigned from me",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed un-assigning from me",
        message: getErrorMessage(error),
      });
    }
  }

  const canMerge =
    !pullRequest.closed &&
    !pullRequest.isDraft &&
    pullRequest.mergeable === MergeableState.Mergeable &&
    pullRequest.mergeStateStatus !== MergeStateStatus.Blocked;

  const anyMergeActionAvailable = canMerge || pullRequest.repository.autoMergeAllowed;

  const viewerUser = getGitHubUser(viewer);

  const isAssignedToMe = pullRequest.assignees.nodes?.some((assignee) => assignee?.isViewer);

  const { isOpenInBrowser } = getPreferenceValues<Preferences>();

  const openInBrowserAction = <Action.OpenInBrowser url={pullRequest.permalink} />;

  const [primaryAction, secondaryAction] = isOpenInBrowser
    ? [openInBrowserAction, children]
    : [children, openInBrowserAction];

  return (
    <ActionPanel title={`#${pullRequest.number} in ${pullRequest.repository.nameWithOwner}`}>
      {primaryAction}
      {secondaryAction}

      <Action.Push
        icon={Icon.Document}
        title="Add Review"
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        target={<AddPullRequestReview pullRequest={pullRequest} mutate={mutate} />}
      />

      <Action.Push
        icon={{ source: "commit.svg", tintColor: Color.PrimaryText }}
        title="See Commits"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        target={<PullRequestCommits pullRequest={pullRequest} />}
      />

      {anyMergeActionAvailable && (
        <ActionPanel.Section>
          {!canMerge && !pullRequest.isInMergeQueue && !pullRequest.repository.autoMergeAllowed && (
            <>
              {pullRequest.autoMergeRequest && (
                <Action
                  title="Disable Auto Merge"
                  icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={() => disableAutoMerge()}
                />
              )}

              {!pullRequest.autoMergeRequest && (
                <Action
                  title="Merge When Ready"
                  icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={() => enableAutoMerge()}
                />
              )}
            </>
          )}

          {pullRequest.isMergeQueueEnabled && canMerge && !pullRequest.isInMergeQueue && (
            <Action
              title="Add to Merge Queue"
              icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={() => addPullRequestToMergeQueue()}
            />
          )}
          {pullRequest.isMergeQueueEnabled && pullRequest.isInMergeQueue && (
            <Action
              title="Remove from Merge Queue"
              icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={() => removePullRequestFromMergeQueue()}
            />
          )}

          {!pullRequest.isMergeQueueEnabled && canMerge ? (
            <>
              {pullRequest.repository.mergeCommitAllowed ? (
                <Action
                  title="Create Merge Commit"
                  icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={() => mergePullRequest(PullRequestMergeMethod.Merge)}
                />
              ) : null}

              {pullRequest.repository.squashMergeAllowed ? (
                <Action
                  title="Squash and Merge"
                  icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
                  onAction={() => mergePullRequest(PullRequestMergeMethod.Squash)}
                />
              ) : null}

              {pullRequest.repository.rebaseMergeAllowed ? (
                <Action
                  title="Rebase and Merge"
                  icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
                  shortcut={{ modifiers: ["opt", "shift"], key: "enter" }}
                  onAction={() => mergePullRequest(PullRequestMergeMethod.Rebase)}
                />
              ) : null}
            </>
          ) : null}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <RequestReviewSubmenu pullRequest={pullRequest} mutate={mutate} />

        {viewer ? (
          <Action
            title={isAssignedToMe ? "Unassign from Me" : "Assign to Me"}
            icon={viewerUser.icon}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={() => (isAssignedToMe ? unassignFromMe(viewer.id) : assignToMe(viewer.id))}
          />
        ) : null}

        <AddAssigneeSubmenu pullRequest={pullRequest} mutate={mutate} />

        <AddProjectSubmenu pullRequest={pullRequest} mutate={mutate} />

        <SetMilestoneSubmenu pullRequest={pullRequest} mutate={mutate} />

        <OpenPreviewSubmenu pullRequest={pullRequest} mutate={mutate} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {pullRequest.closed && !pullRequest.merged ? (
          <Action
            title="Reopen Pull Request"
            icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
            onAction={() => reopenPullRequest()}
          />
        ) : null}

        {!pullRequest.closed ? (
          <Action
            title="Close Pull Request"
            style={Action.Style.Destructive}
            icon={Icon.XMarkCircle}
            onAction={() => closePullRequest()}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={pullRequest.number}
          title="Copy Pull Request Number"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />

        {pullRequest.headRef ? (
          <Action.CopyToClipboard
            content={pullRequest.headRef.name}
            title="Copy Branch Name"
            shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
          />
        ) : null}

        <Action.CopyToClipboard
          content={pullRequest.permalink}
          title="Copy Pull Request URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          content={pullRequest.title}
          title="Copy Pull Request Title"
          shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          content={`[${pullRequest.title}](${pullRequest.permalink})`}
          title="Copy Markdown URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: ";" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <SortAction data={PR_SORT_TYPES_TO_QUERIES} {...{ sortQuery, setSortQuery }} />
        <Action
          icon={Icon.ArrowClockwise}
          title="Refresh"
          onAction={mutate}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

type SubmenuProps = {
  pullRequest: PullRequest;
  mutate: () => Promise<void>;
};

function RequestReviewSubmenu({ pullRequest, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();
  const [load, setLoad] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useCachedPromise(
    async (pullRequest, searchQuery) => {
      return github.repositoryCollaboratorsForPullRequests({
        owner: pullRequest.repository.owner.login,
        name: pullRequest.repository.name,
        pullRequestNumber: pullRequest.number,
        searchQuery,
      });
    },
    [pullRequest, searchQuery],
    { execute: load },
  );

  async function requestReview({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Requesting review", message: text });

      await github.requestReview({
        pullRequestId: pullRequest.id,
        collaboratorId: id,
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Requested review",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed requesting review",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Request Review"
      icon={Icon.AddPerson}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "r" }}
      onOpen={() => setLoad(true)}
      onSearchTextChange={setSearchQuery}
      isLoading={isLoading}
    >
      {data?.repository?.collaborators?.nodes
        ?.filter((collaborator) => !collaborator?.isViewer)
        .map((collaborator) => {
          if (!collaborator) {
            return null;
          }

          const user = getGitHubUser(collaborator);

          return (
            <Action
              key={collaborator.id}
              title={user.text}
              icon={user.icon}
              onAction={() => requestReview({ id: collaborator.id, text: user.text })}
            />
          );
        })}
    </ActionPanel.Submenu>
  );
}

function AddAssigneeSubmenu({ pullRequest, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (pullRequest) => {
      return github.repositoryCollaboratorsForPullRequests({
        owner: pullRequest.repository.owner.login,
        name: pullRequest.repository.name,
        pullRequestNumber: pullRequest.number,
      });
    },
    [pullRequest],
    { execute: load },
  );

  async function addAssignee({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding assignee", message: text });

      const assigneeIds =
        data?.repository?.pullRequest?.assignees.nodes
          ?.filter((assignee) => !!assignee)
          .map((assignee) => assignee?.id) ?? [];

      await github.changePullRequestAssignees({
        pullRequestId: pullRequest.id,
        assigneeIds: [...(assigneeIds as string[]), id],
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Added assignee",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed adding assignee",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Add Assignee"
      icon={Icon.AddPerson}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        data?.repository?.collaborators?.nodes?.map((collaborator) => {
          if (!collaborator) {
            return null;
          }

          const user = getGitHubUser(collaborator);

          return (
            <Action
              key={collaborator.id}
              title={user.text}
              icon={user.icon}
              onAction={() => addAssignee({ id: collaborator.id, text: user.text })}
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}

function AddProjectSubmenu({ pullRequest, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (pullRequest) => {
      return github.repositoryProjectsForPullRequests({
        owner: pullRequest.repository.owner.login,
        name: pullRequest.repository.name,
        pullRequestNumber: pullRequest.number,
      });
    },
    [pullRequest],
    { execute: load },
  );

  async function addProject({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding to project", message: text });

      await github.addPullRequestToProject({
        pullRequestId: pullRequest.id,
        projectId: id,
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Added to project",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed adding to project",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Add to Project"
      icon={{ source: "project.svg", tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        data?.repository?.projectsV2.nodes?.map((project) => {
          if (!project) {
            return null;
          }

          return (
            <Action
              key={project.id}
              title={project.title}
              onAction={() => addProject({ id: project.id, text: project.title })}
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}

function SetMilestoneSubmenu({ pullRequest, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (pullRequest) => {
      return github.milestonesForRepository({
        owner: pullRequest.repository.owner.login,
        name: pullRequest.repository.name,
      });
    },
    [pullRequest],
    { execute: load },
  );

  async function unsetMilestone() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Removing milestone" });

      await github.changePullRequestMilestone({
        pullRequestId: pullRequest.id,
        milestoneId: null,
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Removed milestone",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed removing milestone",
        message: getErrorMessage(error),
      });
    }
  }

  async function setMilestone({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Setting milestone", message: text });

      await github.changePullRequestMilestone({
        pullRequestId: pullRequest.id,
        milestoneId: id,
      });
      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: "Milestone set",
        message: text,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed setting milestone",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Set Milestone"
      icon={{ source: "milestone.svg", tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        <>
          <Action title="No Milestone" onAction={() => unsetMilestone()} />

          {data?.repository?.milestones?.nodes?.map((milestone) => {
            if (!milestone) {
              return null;
            }

            return (
              <Action
                key={milestone.id}
                title={milestone.title}
                onAction={() => setMilestone({ id: milestone.id, text: milestone.title })}
                autoFocus={pullRequest.milestone?.id === milestone.id}
              />
            );
          })}
        </>
      )}
    </ActionPanel.Submenu>
  );
}

function OpenPreviewSubmenu({ pullRequest }: SubmenuProps) {
  const { github } = getGitHubClient();

  const { data, isLoading } = useCachedPromise(
    async (pullRequest) => {
      const data = await github.commentsForPullRequest({
        owner: pullRequest.repository.owner.login,
        name: pullRequest.repository.name,
        number: pullRequest.number,
      });

      const comments = data?.repository?.pullRequest?.comments.nodes;
      const lastVercelComments = comments?.filter((comment) => comment?.author?.login === "vercel");

      if (!lastVercelComments?.length) return undefined;

      const lastVercelComment = lastVercelComments.pop()?.body;

      const vercelPreviewUrl = lastVercelComment
        ?.match(/\[Visit Preview\]\([^)]+\)/)?.[0]
        ?.replace("[Visit Preview](", "")
        .replace(")", "");

      return vercelPreviewUrl ?? undefined;
    },
    [pullRequest],
  );

  return (
    <>
      {isLoading ? (
        <Action title="Loading…" />
      ) : (
        data && (
          <Action.OpenInBrowser
            title="Open Vercel Preview"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            url={data}
            icon={{ source: "vercel.svg", tintColor: Color.PrimaryText }}
          />
        )
      )}
    </>
  );
}
