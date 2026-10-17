import { Action, Color, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { Issue, Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { LabelList } from "./label";
import { IssueMRCreateForm } from "./mr_create";
import { showFailureToast } from "@raycast/utils";

export function CloseIssueAction(props: { issue: Issue; finished?: () => void }) {
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Closing Issue..." });
      await gitlab.post(`projects/${props.issue.project_id}/issues/${props.issue.iid}/notes`, { body: "/close" });
      showToast(Toast.Style.Success, "Issue closed");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to close Issue" });
    }
  }
  return (
    <Action title="Close Issue" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handleAction} />
  );
}

export function CreateMRAction(props: { issue: Issue }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Merge Request"
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={
        <IssueMRCreateForm
          issue={props.issue}
          projectID={props.issue.project_id}
          title={`Draft: Resolve: ${props.issue.title}`}
        />
      }
    />
  );
}

export function ReopenIssueAction(props: { issue: Issue; finished?: () => void }) {
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Reopening Issue..." });
      await gitlab.post(`projects/${props.issue.project_id}/issues/${props.issue.iid}/notes`, { body: "/reopen" });
      showToast(Toast.Style.Success, "Issue reopened");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to reopen Issue" });
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
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding To-Do..." });
      await gitlab.post(`projects/${props.issue.project_id}/issues/${props.issue.iid}/todo`);
      showToast(Toast.Style.Success, "To do created");
    } catch (error) {
      showFailureToast(error, { title: "Failed to add as to do" });
    }
  }
  if (props.issue.state === "opened") {
    return (
      <Action
        title="Add a To-Do"
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
  return (
    <>
      <CreateIssueTodoAction issue={props.issue} shortcut={{ modifiers: ["cmd"], key: "t" }} />
      <ShowIssueLabelsAction labels={props.issue.labels} />
      {props.issue.state == "opened" && <CreateMRAction issue={props.issue} />}
      {props.issue.state == "opened" && <CloseIssueAction issue={props.issue} finished={props.onDataChange} />}
      {props.issue.state == "closed" && <ReopenIssueAction issue={props.issue} finished={props.onDataChange} />}
      <Action.CopyToClipboard title="Copy Issue Number" content={props.issue.iid} />
      <Action.CopyToClipboard title="Copy Issue URL" content={props.issue.web_url} />
      <Action.CopyToClipboard title="Copy Issue Title" content={props.issue.title} />
    </>
  );
}
