import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, showToast, Toast, open } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  createIssueTransition,
  getIssueEditMetadata,
  getIssuePriorities,
  getIssueTransitions,
  Issue,
  Priority,
  startWatchingIssue,
  stopWatchingIssue,
  IssueDetail as TIssueDetail,
  Transition,
  updateIssue,
  updateIssueAssignee,
} from "../api/issues";
import { getJiraCredentials } from "../api/jiraCredentials";
import { autocompleteUsers, User } from "../api/users";
import { getUserAvatar } from "../helpers/avatars";
import { getErrorMessage } from "../helpers/errors";
import { generateBranchName } from "../helpers/issues";

import CreateIssueForm from "./CreateIssueForm";
import IssueAttachments from "./IssueAttachments";
import IssueChildIssues from "./IssueChildIssues";
import IssueCommentForm from "./IssueCommentForm";
import IssueComments from "./IssueComments";
import IssueDetail from "./IssueDetail";

type IssueActionsProps = {
  issue: Issue | TIssueDetail;
  mutate?: MutatePromise<Issue[] | undefined>;
  mutateDetail?: MutatePromise<Issue | TIssueDetail | null>;
  showDetailsAction?: boolean;
  showChildIssuesAction?: boolean;
  showAttachmentsAction?: boolean;
};

type MutateParams = {
  asyncUpdate: Promise<Issue | unknown>;
  optimisticUpdate: <T extends Issue>(task: T) => T;
};

export default function IssueActions({
  issue,
  mutate,
  mutateDetail,
  showDetailsAction,
  showChildIssuesAction,
  showAttachmentsAction,
}: IssueActionsProps) {
  const { siteUrl, myself } = getJiraCredentials();
  const issueUrl = `${siteUrl.startsWith("https://") ? siteUrl : `https://${siteUrl}`}/browse/${issue.key}`;

  async function mutateWithOptimisticUpdate({ asyncUpdate, optimisticUpdate }: MutateParams) {
    if (mutate) {
      await mutate(asyncUpdate, {
        optimisticUpdate(data) {
          if (!data) {
            return;
          }

          return data.map((i) => (i.id === issue.id ? optimisticUpdate(i) : i));
        },
      });
    }

    if (mutateDetail) {
      await mutateDetail(asyncUpdate, {
        optimisticUpdate(data) {
          if (!data) {
            return null;
          }

          return optimisticUpdate(data);
        },
      });
    }
  }

  const isAssignedToMe = myself.accountId === issue.fields.assignee?.accountId;

  async function assignToMe() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Changing assignee" });

      await mutateWithOptimisticUpdate({
        asyncUpdate: updateIssueAssignee(issue.key, isAssignedToMe ? null : myself.accountId),
        optimisticUpdate(issue) {
          return {
            ...issue,
            fields: {
              ...issue.fields,
              assignee: isAssignedToMe ? null : myself,
            },
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed assignee",
        message: `${issue.key} ${isAssignedToMe ? "un-assigned from me" : "assigned to me"}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed changing assignee",
        message: getErrorMessage(error),
      });
    }
  }

  const isWatchedByMe = issue.fields?.watches?.isWatching;

  async function watchIssue() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Changing watching status" });

      await mutateWithOptimisticUpdate({
        asyncUpdate: isWatchedByMe ? stopWatchingIssue(issue.key, myself.accountId) : startWatchingIssue(issue.key),
        optimisticUpdate(issue) {
          return {
            ...issue,
            fields: {
              ...issue.fields,
              watches: { isWatching: !isWatchedByMe },
            },
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed watching status",
        message: `${isWatchedByMe ? "Stopped watching" : "Started watching"} ${issue.key}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed changing watching status",
        message: getErrorMessage(error),
      });
    }
  }

  const { open_in, branch_name } = getPreferenceValues<Preferences>();

  return (
    <ActionPanel title={issue.key}>
      <ActionPanel.Section>
        {showDetailsAction ? (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IssueDetail initialIssue={issue} issueKey={issue.key} />}
          />
        ) : null}

        {open_in ? (
          <Action
            title={`Open in ${open_in.name}`}
            icon={Icon.Globe}
            onAction={async () => {
              open(issueUrl, open_in);
              closeMainWindow();
            }}
          />
        ) : (
          <Action.OpenInBrowser url={issueUrl} />
        )}

        {showAttachmentsAction && "attachment" in issue.fields ? (
          <Action.Push
            title="Show Attachments"
            icon={Icon.Paperclip}
            target={<IssueAttachments attachments={issue.fields.attachment} />}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {issue.fields.parent && (
          <Action.Push
            target={<IssueDetail initialIssue={issue.fields.parent} issueKey={issue.fields.parent?.key} />}
            title="Open Parent Issue"
            icon={Icon.ChevronUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        )}

        {showChildIssuesAction && (
          <Action.Push
            target={<IssueChildIssues issue={issue} />}
            title="Open Child Issues"
            icon={Icon.Tree}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        )}
        <ChangePrioritySubmenu issue={issue} mutate={mutateWithOptimisticUpdate} />

        <ChangeAssigneeSubmenu issue={issue} mutate={mutateWithOptimisticUpdate} />

        <Action
          title={isAssignedToMe ? "Un-Assign From Me" : "Assign to Me"}
          icon={getUserAvatar(myself)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={assignToMe}
        />

        <Action
          title={isWatchedByMe ? "Stop Watching" : "Start Watching"}
          icon={isWatchedByMe ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          onAction={watchIssue}
        />

        <ChangeStatusSubmenu issue={issue} mutate={mutateWithOptimisticUpdate} />

        <Action.Push
          title="Add Comment"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<IssueCommentForm issue={issue} />}
        />
        <Action.Push
          title="Show Comments"
          icon={Icon.Bubble}
          target={<IssueComments issue={issue} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.Push
          title="Create Issue"
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateIssueForm />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Issue Key"
          content={issue.key}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />

        <Action.CopyToClipboard
          title="Copy Issue URL"
          content={issueUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy Issue Title"
          content={issue.fields.summary}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy Issue Key and Title"
          content={`${issue.key} ${issue.fields.summary}`}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "." }}
        />

        <Action.CopyToClipboard
          title="Copy Git Branch Name"
          content={generateBranchName(issue, branch_name)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />

        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${issue.key} - ${issue.fields.summary}](${issueUrl})`}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "," }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            if (mutate) {
              mutate();
            }

            if (mutateDetail) {
              mutateDetail();
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

type SubmenuProps = {
  issue: Issue;
  mutate: (params: MutateParams) => void;
};

function ChangePrioritySubmenu({ issue, mutate }: SubmenuProps) {
  const [load, setLoad] = useState(false);

  const { data: priorities, isLoading } = useCachedPromise(() => getIssuePriorities(), [], { execute: load });

  async function changePriority(priority: Priority) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Changing priority to ${priority.name}` });

      const body = {
        update: {
          priority: [{ set: { id: priority.id } }],
        },
      };

      await mutate({
        asyncUpdate: updateIssue(issue.key, body),
        optimisticUpdate(issue) {
          return {
            ...issue,
            fields: {
              ...issue.fields,
              priority,
            },
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed priority",
        message: `${issue.key} changed to ${priority.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed changing priority",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Change Priority"
      icon={Icon.LevelMeter}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading..." />
      ) : (
        priorities?.map((priority) => {
          return (
            <Action
              key={priority.id}
              title={priority.name ?? "Unknown priority name"}
              icon={priority.iconUrl}
              onAction={() => changePriority(priority)}
              autoFocus={priority.id === issue.fields.priority?.id}
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}

function ChangeAssigneeSubmenu({ issue, mutate }: SubmenuProps) {
  const [load, setLoad] = useState(false);
  const [query, setQuery] = useState("");
  const { myself } = getJiraCredentials();

  const { data, isLoading: isLoadingMetadata } = useCachedPromise((issue) => getIssueEditMetadata(issue.id), [issue], {
    execute: load,
  });
  const autocompleteURL = data?.fields.assignee.autoCompleteUrl;

  // Find a way to display current users then search for users
  const { data: users, isLoading: isLoadingUsers } = useCachedPromise(
    (query) => {
      if (!autocompleteURL) {
        return Promise.resolve([]);
      }

      return autocompleteUsers(autocompleteURL, query);
    },
    [query],
    { execute: !!autocompleteURL },
  );

  async function changeAssignee(assignee: User | null) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Changing assignee" });

      await mutate({
        asyncUpdate: updateIssueAssignee(issue.key, assignee ? assignee.accountId : null),
        optimisticUpdate(issue) {
          return {
            ...issue,
            fields: {
              ...issue.fields,
              assignee,
            },
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed assignee",
        message: `${issue.key} ${assignee ? `assigned to ${assignee.displayName}` : "un-assigned"}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed changing assignee",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel.Submenu
      title="Assign To"
      icon={Icon.AddPerson}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onOpen={() => setLoad(true)}
      onSearchTextChange={setQuery}
      isLoading={isLoadingMetadata || isLoadingUsers}
      throttle
    >
      {users?.map((user) => {
        const title = user.accountId === myself.accountId ? `${user.displayName} (me)` : user.displayName;

        return (
          <Action
            key={user.accountId}
            title={title}
            icon={getUserAvatar(user)}
            autoFocus={user.accountId === issue.fields.assignee?.accountId}
            onAction={() => changeAssignee(user)}
          />
        );
      })}

      <Action title="Unassigned" icon={Icon.Person} onAction={() => changeAssignee(null)} />
    </ActionPanel.Submenu>
  );
}

function ChangeStatusSubmenu({ issue, mutate }: SubmenuProps) {
  const [load, setLoad] = useState(false);

  const { data: transitions, isLoading } = useCachedPromise((issue) => getIssueTransitions(issue.id), [issue], {
    execute: load,
  });

  async function changeTransition(transition: Transition) {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Changing status to ${transition.name}` });

      await mutate({
        asyncUpdate: createIssueTransition(issue.key, transition.id),
        optimisticUpdate(issue) {
          return {
            ...issue,
            fields: {
              ...issue.fields,
              status: transition.to,
            },
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Changed status",
        message: `${issue.key} transitioned to ${transition.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed changing status",
        message: getErrorMessage(error),
      });
    }
  }

  function formattedTitle(transition: Transition): string {
    if (!transition.name) {
      return "Unknown status name";
    }
    if (!transition.to.name) {
      return transition.name;
    }
    if (transition.name === transition.to.name) {
      return transition.name;
    }
    return `${transition.name} -> ${transition.to.name}`;
  }

  return (
    <ActionPanel.Submenu
      title="Change Status"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Loading..." />
      ) : (
        transitions?.map((transition) => {
          if (transition.to.id === issue.fields.status.id) {
            return null;
          }

          return (
            <Action
              key={transition.id}
              title={formattedTitle(transition)}
              onAction={() => changeTransition(transition)}
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}
