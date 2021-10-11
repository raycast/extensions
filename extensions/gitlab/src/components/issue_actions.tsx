import { ActionPanel, closeMainWindow, Color, CopyToClipboardAction, Icon, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Issue } from "../gitlabapi";

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

export function IssueItemActions(props: { issue: Issue }) {
  const issue = props.issue;
  return (
    <React.Fragment>
      {issue.state == "opened" && <CloseIssueAction issue={issue} />}
      {issue.state == "closed" && <ReopenIssueAction issue={issue} />}
      <CopyToClipboardAction title="Copy Issue Number" content={issue.iid} />
      <CopyToClipboardAction title="Copy Issue URL" content={issue.web_url} />
      <CopyToClipboardAction title="Copy Issue Title" content={issue.title} />
    </React.Fragment>
  );
}
