import { Action, ActionPanel, Alert, Clipboard, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import {
  IssueClosedStateReason,
  IssueDetailFieldsFragment,
  IssueFieldsFragment,
  UserFieldsFragment,
} from "../generated/graphql";
import { getErrorMessage } from "../helpers/errors";
import { ISSUE_SORT_TYPES_TO_QUERIES } from "../helpers/issue";
import { getGitHubUser } from "../helpers/users";
import { useMyIssues } from "../hooks/useMyIssues";
import { useViewer } from "../hooks/useViewer";

import { SortAction, SortActionProps } from "./SortAction";

type Issue = IssueFieldsFragment | IssueDetailFieldsFragment;

type IssueActionsProps = {
  issue: Issue;
  viewer?: UserFieldsFragment;
  mutateList?: MutatePromise<IssueFieldsFragment[] | undefined> | ReturnType<typeof useMyIssues>["mutate"];
  mutateDetail?: MutatePromise<Issue>;
  children?: React.ReactNode;
};

export default function IssueActions({
  issue,
  mutateList,
  mutateDetail,
  children,
  setSortQuery,
  sortQuery,
}: IssueActionsProps & SortActionProps) {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  async function mutate() {
    if (mutateList) {
      await mutateList();
    }

    if (mutateDetail) {
      await mutateDetail();
    }
  }

  async function reopenIssue() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Reopening issue #${issue.number}` });

      await github.reopenIssue({ nodeId: issue.id });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Issue #${issue.number} is now open`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed reopening issue",
        message: getErrorMessage(error),
      });
    }
  }

  async function closeIssueAsCompleted() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Closing issue #${issue.number} as completed` });

      await github.closeIssue({ nodeId: issue.id, stateReason: IssueClosedStateReason.Completed });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Issue #${issue.number} closed as completed`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed closing issue as completed",
        message: getErrorMessage(error),
      });
    }
  }

  async function closeIssueAsNotPlanned() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Closing issue #${issue.number} as not planned` });

      await github.closeIssue({ nodeId: issue.id, stateReason: IssueClosedStateReason.NotPlanned });

      await mutate();

      await showToast({
        style: Toast.Style.Success,
        title: `Issue #${issue.number} closed as not planned`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed closing issue as not planned",
        message: getErrorMessage(error),
      });
    }
  }

  async function assignToMe(id: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Assigning to me" });

      const assigneeIds = (issue.assignees.nodes?.filter((assignee) => !!assignee).map((assignee) => assignee?.id) ??
        []) as string[];

      await github.changeIssueAssignees({
        issueId: issue.id,
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

      const assigneeIds = (issue.assignees.nodes?.filter((assignee) => !!assignee).map((assignee) => assignee?.id) ??
        []) as string[];

      await github.changeIssueAssignees({
        issueId: issue.id,
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

  async function createLinkedBranch() {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Creating branch for issue #${issue.number}` });

      const res = await github.createLinkedBranch({
        input: { issueId: issue.id, oid: issue.repository.defaultBranchRef?.target?.oid },
      });
      const branchName = res.createLinkedBranch?.linkedBranch?.ref?.name;
      await mutate();

      if (branchName) {
        await showToast({
          style: Toast.Style.Success,
          title: `${branchName} is created`,
          primaryAction: {
            title: "Copy Branch Name",
            shortcut: { modifiers: ["shift", "cmd"], key: "c" },
            onAction: () => Clipboard.copy(branchName),
          },
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed creating a branch",
        message: getErrorMessage(error),
      });
    }
  }

  async function deleteLinkedBranch(linkedBranchId: string, linkedBranchName: string) {
    if (
      await confirmAlert({
        icon: Icon.Trash,
        title: "Delete the branch",
        message: `${linkedBranchName} will be deleted. Are you sure you want to proceed with the action?`,
        primaryAction: {
          title: "Confirm",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting a branch" });

        await github.deleteLinkedBranch({ input: { linkedBranchId } });
        await mutate();

        await showToast({
          style: Toast.Style.Success,
          title: "Deleted the branch",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed deleting the branch",
          message: getErrorMessage(error),
        });
      }
    }
  }

  const viewerUser = getGitHubUser(viewer);

  const isAssignedToMe = issue.assignees.nodes?.some((assignee) => assignee?.isViewer);

  const linkedBranch = issue.linkedBranches?.nodes?.length ? issue.linkedBranches.nodes[0] : null;

  return (
    <ActionPanel title={`#${issue.number} in ${issue.repository.nameWithOwner}`}>
      {children}

      <Action.OpenInBrowser url={issue.url} />

      <ActionPanel.Section>
        {viewer ? (
          <Action
            title={isAssignedToMe ? "Unassign from Me" : "Assign to Me"}
            icon={viewerUser.icon}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={() => (isAssignedToMe ? unassignFromMe(viewer.id) : assignToMe(viewer.id))}
          />
        ) : null}

        <AddAssigneeSubmenu issue={issue} mutate={mutate} />

        <AddProjectSubmenu issue={issue} mutate={mutate} />

        {!linkedBranch ? (
          <Action
            title={"Create Issue Branch"}
            icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={() => createLinkedBranch()}
          />
        ) : null}

        <SetMilestoneSubmenu issue={issue} mutate={mutate} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {issue.closed ? (
          <Action
            title="Reopen Issue"
            icon={{ source: "issue-reopened.svg", tintColor: Color.Green }}
            onAction={reopenIssue}
          />
        ) : (
          <>
            <Action
              title="Close Issue as Completed"
              style={Action.Style.Destructive}
              icon={{ source: "issue-closed.svg", tintColor: Color.Red }}
              onAction={closeIssueAsCompleted}
            />

            <Action
              title="Close Issue as Not Planned"
              style={Action.Style.Destructive}
              icon={{ source: "skip.svg", tintColor: Color.Red }}
              onAction={closeIssueAsNotPlanned}
            />

            {linkedBranch ? (
              <Action
                title={"Delete Issue Branch"}
                style={Action.Style.Destructive}
                icon={{ source: "branch.svg", tintColor: Color.Red }}
                onAction={() => deleteLinkedBranch(linkedBranch?.id || "", linkedBranch.ref?.name ?? "")}
              />
            ) : null}
          </>
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={issue.number}
          title="Copy Issue Number"
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />

        <Action.CopyToClipboard
          content={issue.url}
          title="Copy Issue URL"
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          content={issue.title}
          title="Copy Issue Title"
          shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
        />

        {linkedBranch?.ref?.name ? (
          <Action.CopyToClipboard
            content={linkedBranch.ref?.name}
            title="Copy Branch Name"
            shortcut={{ modifiers: ["ctrl", "shift"], key: "." }}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <SortAction data={ISSUE_SORT_TYPES_TO_QUERIES} {...{ sortQuery, setSortQuery }} />
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
  issue: Issue;
  mutate: () => Promise<void>;
};

function AddAssigneeSubmenu({ issue, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (issue: Issue) => {
      return github.repositoryCollaboratorsForIssues({
        owner: issue.repository.owner.login,
        name: issue.repository.name,
        issueNumber: issue.number,
      });
    },
    [issue],
    { execute: load },
  );

  async function addAssignee({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding assignee", message: text });

      const assigneeIds =
        data?.repository?.issue?.assignees.nodes?.filter((assignee) => !!assignee).map((assignee) => assignee?.id) ??
        [];

      await github.changeIssueAssignees({
        issueId: issue.id,
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

function AddProjectSubmenu({ issue, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (issue: Issue) => {
      return github.repositoryProjectsForIssues({
        owner: issue.repository.owner.login,
        name: issue.repository.name,
        issueNumber: issue.number,
      });
    },
    [issue],
    { execute: load },
  );

  async function addProject({ id, text }: { id: string; text: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding to project", message: text });

      await github.addIssueToProject({
        issueId: issue.id,
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

function SetMilestoneSubmenu({ issue, mutate }: SubmenuProps) {
  const { github } = getGitHubClient();

  const [load, setLoad] = useState(false);

  const { data, isLoading } = useCachedPromise(
    async (issue: Issue) => {
      return github.milestonesForRepository({
        owner: issue.repository.owner.login,
        name: issue.repository.name,
      });
    },
    [issue],
    { execute: load },
  );

  async function unsetMilestone() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Removing milestone" });

      await github.changeIssueMilestone({
        issueId: issue.id,
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

      await github.changeIssueMilestone({
        issueId: issue.id,
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
                autoFocus={issue.milestone?.id === milestone.id}
              />
            );
          })}
        </>
      )}
    </ActionPanel.Submenu>
  );
}
