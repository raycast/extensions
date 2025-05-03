import { IssuePriorityValue, User } from "@linear/sdk";
import { IssueUpdateInput } from "@linear/sdk/dist/_generated_documents";
import {
  Action,
  Icon,
  ActionPanel,
  showToast,
  Toast,
  confirmAlert,
  Color,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";
import { useState } from "react";

import { IssueResult, IssueDetailResult, Attachment } from "../../api/getIssues";
import { getLinearClient } from "../../api/linearClient";
import { getErrorMessage } from "../../helpers/errors";
import { getEstimateScale } from "../../helpers/estimates";
import { priorityIcons } from "../../helpers/priorities";
import { getUserIcon } from "../../helpers/users";
import useUsers from "../../hooks/useUsers";
import CreateSubIssues from "../CreateSubIssues";
import EditIssueForm from "../EditIssueForm";
import IssueAttachments from "../IssueAttachments";
import { IssueAttachmentsForm } from "../IssueAttachmentsForm";
import IssueCommentForm from "../IssueCommentForm";
import IssueComments from "../IssueComments";
import OpenInLinear from "../OpenInLinear";
import SubIssues from "../SubIssues";

import CopyToClipboardSection from "./CopyToClipboardSection";
import CycleSubmenu from "./CycleSubmenu";
import LabelSubmenu from "./LabelSubmenu";
import MilestoneSubmenu from "./MilestoneSubmenu";
import ParentIssueSubmenu from "./ParentIssueSubmenu";
import ProjectSubmenu from "./ProjectSubmenu";
import StateSubmenu from "./StateSubmenu";

type IssueActionsProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
  mutateDetail?: MutatePromise<IssueDetailResult>;
  mutateSubIssues?: MutatePromise<IssueResult[] | undefined>;
  showAttachmentsAction?: boolean;
  attachments?: Attachment[];
  priorities: IssuePriorityValue[] | undefined;
  me: User | undefined;
};

export type UpdateIssueParams = {
  animatedTitle: string;
  payload: Partial<IssueUpdateInput>;
  optimisticUpdate: <T extends IssueResult>(issue: T) => T;
  rollbackUpdate: <T extends IssueResult>(issue: T) => T;
  successTitle: string;
  successMessage?: string;
  errorTitle: string;
};

export default function IssueActions({
  issue,
  mutateList,
  mutateSubIssues,
  mutateDetail,
  showAttachmentsAction,
  attachments,
  priorities,
  me,
}: IssueActionsProps) {
  const { pop } = useNavigation();

  const { linearClient } = getLinearClient();

  const isAssignedToMe = issue.assignee?.id === me?.id;

  const scale = getEstimateScale({
    issueEstimationType: issue.team.issueEstimationType,
    issueEstimationAllowZero: issue.team.issueEstimationAllowZero,
    issueEstimationExtended: issue.team.issueEstimationExtended,
  });

  async function updateIssue({
    animatedTitle,
    payload,
    optimisticUpdate,
    rollbackUpdate,
    successTitle,
    successMessage,
    errorTitle,
  }: UpdateIssueParams) {
    try {
      await showToast({ style: Toast.Style.Animated, title: animatedTitle });

      const asyncUpdate = linearClient.updateIssue(issue.id, payload);

      await Promise.all([
        asyncUpdate,
        mutateList
          ? mutateList(asyncUpdate, {
              optimisticUpdate(data) {
                if (!data) {
                  return;
                }
                return data.map((x) => (x.id === issue.id ? optimisticUpdate(x) : x));
              },
              rollbackOnError(data) {
                if (!data) {
                  return;
                }
                return data.map((x) => (x.id === issue.id ? rollbackUpdate(x) : x));
              },
            })
          : Promise.resolve(),
        mutateSubIssues
          ? mutateSubIssues(asyncUpdate, {
              optimisticUpdate(data) {
                if (!data) {
                  return;
                }
                return data.map((x) => (x.id === issue.id ? optimisticUpdate(x) : x));
              },
              rollbackOnError(data) {
                if (!data) {
                  return;
                }
                return data.map((x) => (x.id === issue.id ? rollbackUpdate(x) : x));
              },
            })
          : Promise.resolve(),
        mutateDetail
          ? mutateDetail(asyncUpdate, {
              optimisticUpdate(data) {
                return optimisticUpdate(data);
              },
              rollbackOnError(data) {
                return rollbackUpdate(data);
              },
            })
          : Promise.resolve(),
      ]);

      await showToast({
        style: Toast.Style.Success,
        title: successTitle,
        message: successMessage,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: getErrorMessage(error),
      });
    }
  }

  async function deleteIssue() {
    if (
      await confirmAlert({
        title: "Delete Issue",
        message: "Are you sure you want to delete the selected issue?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting issue" });

        const asyncUpdate = linearClient.deleteIssue(issue.id);

        if (mutateDetail) {
          pop();
        }

        await Promise.all([
          asyncUpdate,
          mutateList
            ? mutateList(asyncUpdate, {
                optimisticUpdate(data) {
                  if (!data) {
                    return;
                  }
                  return data.filter((x) => x.id !== issue.id);
                },
              })
            : Promise.resolve(),
          mutateSubIssues
            ? mutateSubIssues(asyncUpdate, {
                optimisticUpdate(data) {
                  if (!data) {
                    return;
                  }
                  return data.filter((x) => x.id !== issue.id);
                },
              })
            : Promise.resolve(),
        ]);

        await showToast({
          style: Toast.Style.Success,
          title: "Issue deleted",
          message: `"${issue.title}" is deleted`,
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete issue",
          message: getErrorMessage(error),
        });
      }
    }
  }

  async function setPriority(priority: IssuePriorityValue) {
    const currentPriority = issue.priority;
    updateIssue({
      animatedTitle: "Setting priority",
      payload: { priority: priority.priority },
      optimisticUpdate(issue) {
        return {
          ...issue,
          priority: priority.priority,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          priority: currentPriority,
        };
      },
      successTitle: "Set priority",
      successMessage: `${issue.identifier} priority set to ${priority.label}`,
      errorTitle: "Failed to set priority",
    });
  }

  async function setAssignee(assignee: User) {
    const currentAssignee = issue.assignee;
    updateIssue({
      animatedTitle: "Setting assignee",
      payload: { assigneeId: assignee.id },
      optimisticUpdate(issue) {
        return {
          ...issue,
          assignee,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          assignee: currentAssignee,
        };
      },
      successTitle: "Set assignee",
      successMessage: `${issue.identifier} assigned to ${assignee.displayName}`,
      errorTitle: "Failed to set assignee",
    });
  }

  async function setToMe(me: User | null) {
    const currentAssignee = issue.assignee;
    updateIssue({
      animatedTitle: "Setting assignee",
      payload: { assigneeId: me ? me.id : null },
      optimisticUpdate(issue) {
        return {
          ...issue,
          assignee: me || undefined,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          assignee: currentAssignee,
        };
      },
      successTitle: "Set assignee",
      successMessage: `${issue.identifier} ${me ? "assigned to" : "un-assigned from"} me`,
      errorTitle: "Failed to set assignee",
    });
  }

  async function setEstimate({ estimate, label }: { estimate: number; label: string }) {
    const currentEstimate = issue.estimate;
    updateIssue({
      animatedTitle: "Setting estimate",
      payload: { estimate },
      optimisticUpdate(issue) {
        return {
          ...issue,
          estimate,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          estimate: currentEstimate,
        };
      },
      successTitle: "Set estimate",
      successMessage: `${issue.identifier} estimate set to ${label}`,
      errorTitle: "Failed to set estimate",
    });
  }

  async function setDueDate(dueDate: Date | null) {
    updateIssue({
      animatedTitle: dueDate ? "Setting due date" : "Removing due date",
      payload: { dueDate },
      optimisticUpdate(issue) {
        return {
          ...issue,
          dueDate,
        };
      },
      rollbackUpdate(issue) {
        return {
          ...issue,
          dueDate: issue.dueDate,
        };
      },
      successTitle: dueDate ? "Set due date" : "Removed due date",
      successMessage: dueDate ? `${issue.identifier} due date set to ${format(dueDate, "MM/dd/yyyy")}` : "",
      errorTitle: "Failed to set due date",
    });
  }

  async function setReminder(reminderDate: Date | null) {
    if (!reminderDate) {
      await showToast({ style: Toast.Style.Failure, title: "Failed setting reminder" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Setting reminder" });

      await linearClient.issueReminder(issue.id, reminderDate);

      if (mutateDetail) {
        pop();
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Reminder set",
        message: `${issue.identifier} reminder set to ${format(reminderDate, "MM/dd/yyyy")}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set reminder",
        message: getErrorMessage(error),
      });
    }
  }

  function refresh() {
    if (mutateList) {
      mutateList();
    }

    if (mutateSubIssues) {
      mutateSubIssues();
    }

    if (mutateDetail) {
      mutateDetail();
    }
  }

  const [userQuery, setUserQuery] = useState<string>("");
  const { users, supportsUserTypeahead, isLoadingUsers } = useUsers(userQuery);

  return (
    <>
      <OpenInLinear title="Open Issue" url={issue.url} />

      <ActionPanel.Section>
        <Action.Push
          title="Edit Issue"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={
            <EditIssueForm
              priorities={priorities}
              me={me}
              issue={issue}
              mutateList={mutateList}
              mutateSubIssues={mutateSubIssues}
            />
          }
        />

        <StateSubmenu issue={issue} updateIssue={updateIssue} />

        {priorities && priorities.length > 0 ? (
          <ActionPanel.Submenu
            icon={Icon.LevelMeter}
            title="Set Priority"
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          >
            {priorities.map((priority) => (
              <Action
                key={priority.priority}
                autoFocus={priority.priority === issue.priority}
                title={priority.label}
                icon={{ source: priorityIcons[priority.priority] }}
                onAction={() => setPriority(priority)}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}

        <ActionPanel.Submenu
          icon={Icon.AddPerson}
          title="Assign to"
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          {...(supportsUserTypeahead && {
            onSearchTextChange: setUserQuery,
            isLoading: isLoadingUsers,
            throttle: true,
          })}
        >
          {users?.map((user) => (
            <Action
              key={user.id}
              autoFocus={user.id === issue.assignee?.id}
              title={`${user.displayName} (${user.email})`}
              icon={getUserIcon(user)}
              onAction={() => setAssignee(user)}
            />
          ))}
        </ActionPanel.Submenu>

        {me ? (
          <Action
            title={isAssignedToMe ? "Un-Assign from Me" : "Assign to Me"}
            icon={getUserIcon(me)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={() => setToMe(isAssignedToMe ? null : me)}
          />
        ) : null}

        {scale ? (
          <ActionPanel.Submenu
            title="Set Estimate"
            icon={{ source: { light: "light/estimate.svg", dark: "dark/estimate.svg" } }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          >
            {scale.map(({ estimate, label }) => {
              return (
                <Action
                  key={estimate}
                  autoFocus={estimate === issue.estimate}
                  title={label}
                  onAction={() => setEstimate({ estimate, label })}
                />
              );
            })}
          </ActionPanel.Submenu>
        ) : null}

        <Action.PickDate
          title="Set Due Date"
          shortcut={{ modifiers: ["opt", "shift"], key: "d" }}
          onChange={setDueDate}
        />

        <Action.PickDate
          title="Set Reminder"
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          onChange={setReminder}
        />

        <LabelSubmenu issue={issue} updateIssue={updateIssue} />

        <CycleSubmenu issue={issue} updateIssue={updateIssue} />

        <ProjectSubmenu issue={issue} updateIssue={updateIssue} />

        <MilestoneSubmenu issue={issue} updateIssue={updateIssue} />

        <ParentIssueSubmenu issue={issue} updateIssue={updateIssue} />

        <Action
          title="Delete Issue"
          shortcut={Keyboard.Shortcut.Common.Remove}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => deleteIssue()}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          title="Show Sub-Issues"
          icon={Icon.List}
          target={<SubIssues issue={issue} mutateList={mutateList} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />

        <Action.Push
          title="Break Issues into Sub-Issues"
          icon={Icon.Stars}
          target={<CreateSubIssues issue={issue} />}
          shortcut={{ modifiers: ["opt", "shift"], key: "m" }}
        />

        {showAttachmentsAction ? (
          <Action.Push
            title="Show Issue Links"
            icon={Icon.Link}
            target={<IssueAttachments attachments={attachments ?? []} issue={issue} />}
            shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "l" }}
          />
        ) : null}

        <Action.Push
          title="Add Attachments and Links"
          icon={Icon.NewDocument}
          target={<IssueAttachmentsForm issue={issue} />}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "a" }}
        />

        <Action.Push
          title="Add Comment"
          icon={Icon.Plus}
          target={<IssueCommentForm issue={issue} />}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "n" }}
        />

        <Action.Push
          title="Show Comments"
          icon={Icon.Bubble}
          target={<IssueComments issue={issue} />}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

      <CopyToClipboardSection issue={issue} />

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => refresh()}
        />
      </ActionPanel.Section>
    </>
  );
}
