import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Image, Keyboard, showToast, Toast } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { copyMarkdownShortcut, copyShortcut } from "../utils";
import { MRCommitList } from "./commits/list";
import { MREditForm } from "./mr_create";
import { MRDiscussionList } from "./mr_discussion_list";
import { MRPipelineList } from "./mr_pipelines";
import { showFailureToast } from "@raycast/utils";

async function createNote(mr: MergeRequest, body: string): Promise<void> {
  return await gitlab.post(`projects/${mr.project_id}/merge_requests/${mr.iid}/notes`, { body: body });
}

export function EditMRAction(props: { mr: MergeRequest; onUpdated?: () => void }): React.ReactElement | null {
  if (props.mr.user?.can_update !== true) {
    return null;
  }
  return (
    <Action.Push
      title="Edit Merge Request"
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      icon={{ source: Icon.Pencil, tintColor: Color.Yellow }}
      target={<MREditForm mr={props.mr} onUpdated={props.onUpdated} />}
    />
  );
}

export function CloseMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  async function handleAction() {
    if (
      !(await confirmAlert({
        title: "Close Merge Request?",
        message: `Close !${props.mr.iid} "${props.mr.title}"?`,
        primaryAction: { title: "Close", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Closing Merge Request..." });
      await createNote(props.mr, "/close");
      showToast(Toast.Style.Success, "Closed");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to close Merge Request" });
    }
  }
  return (
    <Action
      title="Close"
      icon={{ source: GitLabIcons.mropen, tintColor: Color.Red, mask: Image.Mask.Circle }}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={handleAction}
    />
  );
}

export function ReopenMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Reopening Merge Request..." });
      await createNote(props.mr, "/reopen");
      showToast(Toast.Style.Success, "Reopened");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to reopen Merge Request" });
    }
  }
  return <Action title="Reopen" icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />;
}

export function RebaseMRAction(props: { mr: MergeRequest; shortcut?: Keyboard.Shortcut; finished?: () => void }) {
  async function handleAction() {
    if (
      !(await confirmAlert({
        title: "Rebase Merge Request?",
        message: `Rebase !${props.mr.iid} "${props.mr.title}"?`,
        primaryAction: { title: "Rebase", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Rebasing Merge Request..." });
      await createNote(props.mr, "/rebase");
      showToast(Toast.Style.Success, "Rebased");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to rebase Merge Request" });
    }
  }
  return (
    <Action
      title="Rebase"
      shortcut={props.shortcut}
      icon={{ source: GitLabIcons.rebase, tintColor: Color.Yellow }}
      onAction={handleAction}
    />
  );
}

export function ApproveMRAction(props: { mr: MergeRequest; finished?: () => void }): React.ReactElement | null {
  if (props.mr.state !== "opened") {
    return null;
  }
  const approved = props.mr.user?.approved === true;
  async function handleAction() {
    if (approved) {
      if (
        !(await confirmAlert({
          title: "Revoke Approval?",
          message: `Revoke your approval for !${props.mr.iid} "${props.mr.title}"?`,
          primaryAction: { title: "Revoke Approval", style: Alert.ActionStyle.Destructive },
        }))
      ) {
        return;
      }
      try {
        await showToast({ style: Toast.Style.Animated, title: "Revoking approval..." });
        await gitlab.post(`projects/${props.mr.project_id}/merge_requests/${props.mr.iid}/unapprove`);
        showToast(Toast.Style.Success, "Approval revoked");
        props.finished?.();
      } catch (error) {
        showFailureToast(error, { title: "Failed to revoke approval" });
      }
      return;
    }
    if (
      !(await confirmAlert({
        title: "Approve Merge Request?",
        message: `Approve !${props.mr.iid} "${props.mr.title}"?`,
        primaryAction: { title: "Approve" },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Approving Merge Request..." });
      await gitlab.post(`projects/${props.mr.project_id}/merge_requests/${props.mr.iid}/approve`);
      showToast(Toast.Style.Success, "Approved");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to approve Merge Request" });
    }
  }
  return (
    <Action
      title={approved ? "Revoke Approval" : "Approve"}
      icon={
        approved ? { source: Icon.Xmark, tintColor: Color.Red } : { source: Icon.Checkmark, tintColor: Color.Green }
      }
      onAction={handleAction}
    />
  );
}

export function MergeMRAction(props: {
  mr: MergeRequest;
  shortcut?: Keyboard.Shortcut;
  finished?: () => void;
}): React.ReactElement | null {
  async function handleAction() {
    if (
      !(await confirmAlert({
        title: "Merge Merge Request?",
        message: `Merge !${props.mr.iid} "${props.mr.title}"?`,
        primaryAction: { title: "Merge", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Merging Merge Request..." });
      await gitlab.put(`projects/${props.mr.project_id}/merge_requests/${props.mr.iid}/merge`);
      showToast(Toast.Style.Success, "Merged");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Merge" });
    }
  }
  if (props.mr.state === "opened" && props.mr.user?.can_merge === true) {
    return (
      <Action
        title="Merge"
        shortcut={props.shortcut}
        icon={{ source: GitLabIcons.merged, tintColor: Color.PrimaryText }}
        onAction={handleAction}
      />
    );
  }
  return null;
}

function MRTodoAction(props: {
  mr: MergeRequest;
  shortcut?: Keyboard.Shortcut;
  finished?: () => void;
}): React.ReactElement | null {
  if (props.mr.state !== "opened" && !props.mr.todo_id) {
    return null;
  }

  if (props.mr.todo_id) {
    async function markAsDone() {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Marking Todo as done..." });
        await gitlab.post(`todos/${props.mr.todo_id}/mark_as_done`);
        showToast(Toast.Style.Success, "Done", "Todo is now marked as done");
        props.finished?.();
      } catch (error) {
        showFailureToast(error, { title: "Failed to mark Todo as done" });
      }
    }
    return (
      <Action
        title="Mark as Done"
        shortcut={props.shortcut}
        icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        onAction={markAsDone}
      />
    );
  }

  async function addTodo() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding To-Do..." });
      await gitlab.post(`projects/${props.mr.project_id}/merge_requests/${props.mr.iid}/todo`);
      showToast(Toast.Style.Success, "To do created");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add to do" });
    }
  }

  return (
    <Action
      title="Add a To-Do"
      shortcut={props.shortcut}
      icon={{ source: GitLabIcons.todo, tintColor: Color.PrimaryText }}
      onAction={addTodo}
    />
  );
}

export function MRCopySection(props: { mr: MergeRequest; showCopyMarkdown?: boolean }): React.ReactElement {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={props.mr.web_url} shortcut={copyShortcut} />
      {props.showCopyMarkdown && (
        <Action.CopyToClipboard
          title="Copy Markdown"
          content={`[${props.mr.title}](${props.mr.web_url})`}
          shortcut={copyMarkdownShortcut}
        />
      )}
    </ActionPanel.Section>
  );
}

export function MRItemActions(props: {
  mr: MergeRequest;
  onDataChange?: () => void;
  todoShortcut?: Keyboard.Shortcut;
}) {
  return (
    <React.Fragment>
      {props.mr.state === "closed" && (
        <ActionPanel.Section>
          <ReopenMRAction mr={props.mr} finished={props.onDataChange} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <MRTodoAction mr={props.mr} shortcut={props.todoShortcut} finished={props.onDataChange} />
        <ApproveMRAction mr={props.mr} finished={props.onDataChange} />
        <RebaseMRAction
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          mr={props.mr}
          finished={props.onDataChange}
        />
        <MergeMRAction
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          mr={props.mr}
          finished={props.onDataChange}
        />
        {props.mr.state === "opened" && <CloseMRAction mr={props.mr} finished={props.onDataChange} />}
      </ActionPanel.Section>
    </React.Fragment>
  );
}

export function ShowMRCommitsAction(props: { mr: MergeRequest }) {
  return (
    <Action.Push
      title="Show Commits"
      icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      target={
        <MRCommitList
          projectID={props.mr.project_id}
          projectFullPath={props.mr.project_full_path}
          mrIID={props.mr.iid}
          navigationTitle={props.mr.title}
        />
      }
    />
  );
}

export function ShowMRPipelinesAction(props: { mr: MergeRequest }) {
  return (
    <Action.Push
      title="Show Pipelines"
      icon={{ source: GitLabIcons.ci, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      target={<MRPipelineList mr={props.mr} />}
    />
  );
}

export function ShowMRDiscussionsAction(props: { mr: MergeRequest }) {
  if (props.mr.resolvable_discussions_count === undefined || props.mr.resolvable_discussions_count <= 0) {
    return null;
  }
  return (
    <Action.Push
      title="Show Discussions"
      icon={{ source: Icon.SpeechBubble, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      target={<MRDiscussionList mr={props.mr} />}
    />
  );
}

export function RefreshMergeRequestsAction(props: { onRefresh?: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={() => props.onRefresh?.()}
    />
  );
}
