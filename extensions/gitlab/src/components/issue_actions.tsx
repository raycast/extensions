import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Icon,
  KeyboardShortcut,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Issue, Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage } from "../utils";
import { LabelList } from "./label";
import { IssueMRCreateForm } from "./mr_create";

export function CloseIssueAction(props: { issue: Issue; finished?: () => void }): JSX.Element {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/close" });
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to close issue", getErrorMessage(error));
    }
  }
  return (
    <ActionPanel.Item
      title="Close Issue"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}

export function CreateMRAction({ issue }: { issue: Issue }): JSX.Element {
  return (
    <PushAction
      icon={Icon.Pencil}
      title="Create Merge Request"
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<IssueMRCreateForm issue={issue} projectID={issue.project_id} title={`Draft: Resolve: ${issue.title}`} />}
    />
  );
}

export function ReopenIssueAction(props: { issue: Issue; finished?: () => void }): JSX.Element {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/reopen" });
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to reopen issue", getErrorMessage(error));
    }
  }
  return <ActionPanel.Item title="Reopen Issue" icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />;
}

function ShowIssueLabelsAction(props: { labels: Label[] }) {
  if (props.labels.length <= 0) {
    return null;
  }
  return (
    <PushAction
      title="Show attached Labels"
      target={<LabelList labels={props.labels} />}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
    />
  );
}

export function CreateIssueTodoAction(props: { issue: Issue; shortcut?: KeyboardShortcut }): JSX.Element | null {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/todo`);
      showToast(ToastStyle.Success, "To do created");
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to add as to do", getErrorMessage(error));
    }
  }
  if (issue.state === "opened") {
    return (
      <ActionPanel.Item
        title="Add a to do"
        shortcut={props.shortcut}
        icon={{ source: GitLabIcons.todo, tintColor: Color.PrimaryText }}
        onAction={handleAction}
      />
    );
  } else {
    return null;
  }
}

export function IssueItemActions(props: { issue: Issue; onDataChange?: () => void }): JSX.Element {
  const issue = props.issue;
  return (
    <React.Fragment>
      <CreateIssueTodoAction issue={issue} shortcut={{ modifiers: ["cmd"], key: "t" }} />
      <ShowIssueLabelsAction labels={issue.labels} />
      {issue.state == "opened" && <CreateMRAction issue={issue} />}
      {issue.state == "opened" && <CloseIssueAction issue={issue} finished={props.onDataChange} />}
      {issue.state == "closed" && <ReopenIssueAction issue={issue} finished={props.onDataChange} />}
      <CopyToClipboardAction title="Copy Issue Number" content={issue.iid} />
      <CopyToClipboardAction title="Copy Issue URL" content={issue.web_url} />
      <CopyToClipboardAction title="Copy Issue Title" content={issue.title} />
    </React.Fragment>
  );
}
