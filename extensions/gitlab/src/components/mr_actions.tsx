import { Action, Color, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { Label, MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage, showErrorToast } from "../utils";
import { ProjectCommitList } from "./commits/list";
import { LabelList } from "./label";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function createNote(mr: MergeRequest, body: string): Promise<any> {
  return await gitlab.post(`projects/${mr.project_id}/merge_requests/${mr.iid}/notes`, { body: body });
}

export function CloseMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/close");
      showToast(Toast.Style.Success, "Closed");
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to close Merge Request");
    }
  }
  return <Action title="Close Mr" icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }} onAction={handleAction} />;
}

export function ReopenMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/reopen");
      showToast(Toast.Style.Success, "Reopened");
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to reopen Merge Request");
    }
  }
  return <Action title="Reopen Mr" icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />;
}

export function RebaseMRAction(props: { mr: MergeRequest; shortcut?: Keyboard.Shortcut }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/rebase");
      showToast(Toast.Style.Success, "Rebased");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to rebase Merge Request");
    }
  }
  return (
    <Action title="Rebase" shortcut={props.shortcut} icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />
  );
}

export function MergeMRAction(props: {
  mr: MergeRequest;
  shortcut?: Keyboard.Shortcut;
  finished?: () => void;
}): React.ReactElement | null {
  const mr = props.mr;
  async function handleAction() {
    try {
      await gitlab.put(`projects/${mr.project_id}/merge_requests/${mr.iid}/merge`);
      showToast(Toast.Style.Success, "Merged");
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to Merge");
    }
  }
  if (mr.state === "opened") {
    return (
      <Action
        title="Merge"
        shortcut={props.shortcut}
        icon={{ source: GitLabIcons.merged, tintColor: Color.PrimaryText }}
        onAction={handleAction}
      />
    );
  } else {
    return null;
  }
}

export function CreateTodoMRAction(props: {
  mr: MergeRequest;
  shortcut?: Keyboard.Shortcut;
}): React.ReactElement | null {
  const mr = props.mr;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${mr.project_id}/merge_requests/${mr.iid}/todo`);
      showToast(Toast.Style.Success, "To do created");
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to add to do");
    }
  }
  if (mr.state === "opened") {
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

function ShowMRLabelsAction(props: { labels: Label[] }) {
  if (props.labels.length <= 0) {
    return null;
  }
  return (
    <Action.Push
      title="Show Labels"
      target={<LabelList labels={props.labels} />}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: GitLabIcons.labels, tintColor: Color.PrimaryText }}
    />
  );
}

export function MRItemActions(props: { mr: MergeRequest; onDataChange?: () => void }) {
  const mr = props.mr;
  return (
    <React.Fragment>
      <CreateTodoMRAction shortcut={{ modifiers: ["cmd"], key: "t" }} mr={mr} />
      {mr.state === "opened" && <CloseMRAction mr={mr} finished={props.onDataChange} />}
      {mr.state === "closed" && <ReopenMRAction mr={mr} finished={props.onDataChange} />}
      <MergeMRAction shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} mr={mr} finished={props.onDataChange} />
      <RebaseMRAction shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} mr={mr} />
      <Action.CopyToClipboard title="Copy Merge Request Number" content={mr.iid} />
      <Action.CopyToClipboard title="Copy Merge Request URL" content={mr.web_url} />
      <Action.CopyToClipboard title="Copy Merge Request Title" content={mr.title} />
      <ShowMRCommitsAction mr={mr} />
      <ShowMRLabelsAction labels={mr.labels} />
    </React.Fragment>
  );
}

export function ShowMRCommitsAction(props: { mr: MergeRequest }) {
  const mr = props.mr;
  return (
    <Action.Push
      title="Show Commits"
      icon={{ source: GitLabIcons.commit, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      target={<ProjectCommitList projectID={mr.project_id} refName={mr.source_branch} />}
    />
  );
}
