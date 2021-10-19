import {
  ActionPanel,
  closeMainWindow,
  Color,
  CopyToClipboardAction,
  Icon,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Issue, Label } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { LabelList } from "./label";
import { stringToSlug } from "../utils";

export function CloseIssueAction(props: { issue: Issue }) {
  const issue = props.issue;
  async function handleAction() {
    try {
      await closeMainWindow();
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/close" });
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to close issue", error instanceof Error ? error.message : error.toString());
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

export function CreateMRAction(props: { issue: Issue }): JSX.Element {
  const issue = props.issue;

  async function handleAction() {
    try {
      const project = await gitlab.getProject(issue.project_id);
      const branch = await gitlab.post(
        `projects/${issue.project_id}/repository/branches?branch=${`${issue.iid}-${stringToSlug(issue.title)}`}&ref=${
          project.default_branch
        }`
      );
      const mr_title = `Resolve: ${issue.title}`;
      await gitlab.createMR(issue.project_id, {
        id: issue.project_id,
        source_branch: branch.name,
        target_branch: project.default_branch,
        title: mr_title,
        assignee_id: project.owner?.id,
      });
      showToast(ToastStyle.Success, "MR created successfully", mr_title);
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to create MR", (error instanceof Error && error.message) || "");
    }
  }
  return <ActionPanel.Item title="Create MR" icon={Icon.Star} onAction={handleAction} />;
}

export function ReopenIssueAction(props: { issue: Issue }) {
  const issue = props.issue;
  async function handleAction() {
    try {
      await closeMainWindow();
      await gitlab.post(`projects/${issue.project_id}/issues/${issue.iid}/notes`, { body: "/reopen" });
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to reopen issue",
        error instanceof Error ? error.message : error.toString()
      );
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

export function IssueItemActions(props: { issue: Issue }) {
  const issue = props.issue;
  return (
    <React.Fragment>
      <ShowIssueLabelsAction labels={issue.labels} />
      {issue.state == "opened" && <CreateMRAction issue={issue} />}
      {issue.state == "opened" && <CloseIssueAction issue={issue} />}
      {issue.state == "closed" && <ReopenIssueAction issue={issue} />}
      <CopyToClipboardAction title="Copy Issue Number" content={issue.iid} />
      <CopyToClipboardAction title="Copy Issue URL" content={issue.web_url} />
      <CopyToClipboardAction title="Copy Issue Title" content={issue.title} />
    </React.Fragment>
  );
}
