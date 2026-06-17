import { Action, Color, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { Issue, Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage, showErrorToast } from "../utils";
import { LabelList } from "./label";
import { IssueMRCreateForm } from "./mr_create";

export function CloseIssueAction(props: { issue: Issue; finished?: () => void }) {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/close" });
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to close Issue");
    }
  }
  return (
    <Action title="Close Issue" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handleAction} />
  );
}

export function CreateMRAction({ issue }: { issue: Issue }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Merge Request"
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<IssueMRCreateForm issue={issue} projectID={issue.project_id} title={`Draft: Resolve: ${issue.title}`} />}
    />
  );
}

export function ReopenIssueAction(props: { issue: Issue; finished?: () => void }) {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/reopen" });
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to reopen Issue");
    }
  }
  return <Action title="Reopen Issue" icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />;
}

function ShowIssueLabelsAction(props: { labels: Label[] }) {
  if (props.labels.length <= 0) {
    return null;
  }
  return (
    <Action.Push
      title="Show Attached Labels"
      target={<LabelList labels={props.labels} />}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
    />
  );
}

export function CreateIssueTodoAction(props: { issue: Issue; shortcut?: Keyboard.Shortcut }) {
  const issue = props.issue;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/todo`);
      showToast(Toast.Style.Success, "To do created");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to add as to do");
    }
  }
  if (issue.state === "opened") {
    return (
      <Action
        title="Add a to Do"
        shortcut={props.shortcut}
        icon={{ source: GitLabIcons.todo, tintColor: Color.PrimaryText }}
        onAction={handleAction}
      />
    );
  } else {
    return null;
  }
}

export function IssueItemActions(props: { issue: Issue; onDataChange?: () => void }) {
  const issue = props.issue;
  return (
    <>
      <CreateIssueTodoAction issue={issue} shortcut={{ modifiers: ["cmd"], key: "t" }} />
      <ShowIssueLabelsAction labels={issue.labels} />
      {issue.state == "opened" && <CreateMRAction issue={issue} />}
      {issue.state == "opened" && <CloseIssueAction issue={issue} finished={props.onDataChange} />}
      {issue.state == "closed" && <ReopenIssueAction issue={issue} finished={props.onDataChange} />}
      <Action.CopyToClipboard title="Copy Issue Number" content={issue.iid} />
      <Action.CopyToClipboard title="Copy Issue URL" content={issue.web_url} />
      <Action.CopyToClipboard title="Copy Issue Title" content={issue.title} />
    </>
  );
}
