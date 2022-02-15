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
import { Label, MergeRequest } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { LabelList } from "./label";

async function createNote(mr: MergeRequest, body: string): Promise<any> {
  return await gitlab.post(`projects/${mr.project_id}/merge_requests/${mr.iid}/notes`, { body: body });
}

export function CloseMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/close");
      showToast(ToastStyle.Success, "Closed");
      if (props.finished) {
        props.finished();
      }
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to close merge request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }
  return (
    <ActionPanel.Item
      title="Close MR"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}

export function ReopenMRAction(props: { mr: MergeRequest; finished?: () => void }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/reopen");
      showToast(ToastStyle.Success, "Reopened");
      if (props.finished) {
        props.finished();
      }
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to reopen merge request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }
  return <ActionPanel.Item title="Reopen MR" icon={{ source: Icon.ExclamationMark }} onAction={handleAction} />;
}

export function RebaseMRAction(props: { mr: MergeRequest; shortcut?: KeyboardShortcut }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await createNote(mr, "/rebase");
      showToast(ToastStyle.Success, "Rebased");
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to rebase merge request",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }
  return (
    <ActionPanel.Item
      title="Rebase"
      shortcut={props.shortcut}
      icon={{ source: Icon.ExclamationMark }}
      onAction={handleAction}
    />
  );
}

export function MergeMRAction(props: { mr: MergeRequest; shortcut?: KeyboardShortcut; finished?: () => void }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await gitlab.put(`projects/${mr.project_id}/merge_requests/${mr.iid}/merge`);
      showToast(ToastStyle.Success, "Merged");
      if (props.finished) {
        props.finished();
      }
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to merge", error instanceof Error ? error.message : error.toString());
    }
  }
  if (mr.state === "opened") {
    return (
      <ActionPanel.Item
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

export function CreateTodoMRAction(props: { mr: MergeRequest; shortcut?: KeyboardShortcut }) {
  const mr = props.mr;
  async function handleAction() {
    try {
      await gitlab.post(`projects/${mr.project_id}/merge_requests/${mr.iid}/todo`);
      showToast(ToastStyle.Success, "To do created");
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to add to do", error instanceof Error ? error.message : error.toString());
    }
  }
  if (mr.state === "opened") {
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

function ShowMRLabelsAction(props: { labels: Label[] }) {
  if (props.labels.length <= 0) {
    return null;
  }
  return (
    <PushAction
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
      <CopyToClipboardAction title="Copy Merge Request Number" content={mr.iid} />
      <CopyToClipboardAction title="Copy Merge Request URL" content={mr.web_url} />
      <CopyToClipboardAction title="Copy Merge Request Title" content={mr.title} />
      <ShowMRLabelsAction labels={mr.labels} />
    </React.Fragment>
  );
}
