import { ActionPanel, Color, Icon, PushAction, showToast, ToastStyle } from "@raycast/api";
import React from "react";
import { gitlab } from "../common";
import { jsonDataToIssue, jsonDataToMergeRequest as jsonDataToMergeRequest, Todo } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { IssueDetail } from "./issues";
import { MRDetail } from "./mr";

export function ShowTodoDetailsAction(props: { todo: Todo }) {
  const todo = props.todo;
  const icon = { source: GitLabIcons.show_details, tintColor: Color.PrimaryText };
  if (todo.target_type === "MergeRequest") {
    const mr = jsonDataToMergeRequest(todo.target);
    return <PushAction title="Show Details" target={<MRDetail mr={mr} />} icon={icon} />;
  } else if (todo.target_type === "Issue") {
    const issue = jsonDataToIssue(todo.target);
    return <PushAction title="Show Details" target={<IssueDetail issue={issue} />} icon={icon} />;
  } else {
    return null;
  }
}

export function CloseTodoAction(props: { todo: Todo }) {
  const todo = props.todo;
  async function handleAction() {
    try {
      await gitlab.post(`todos/${todo.id}/mark_as_done`);
    } catch (error: any) {
      showToast(ToastStyle.Failure, "Failed to Close to do", error instanceof Error ? error.message : error.toString());
    }
  }
  return (
    <ActionPanel.Item
      title="Mark as Done"
      icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={handleAction}
    />
  );
}

export function CloseAllTodoAction() {
  async function handleAction() {
    try {
      await gitlab.post(`todos/mark_as_done`);
    } catch (error: any) {
      showToast(
        ToastStyle.Failure,
        "Failed to Close All to do's",
        error instanceof Error ? error.message : error.toString()
      );
    }
  }
  return (
    <ActionPanel.Item
      title="Mark All as Done"
      icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
      onAction={handleAction}
    />
  );
}

export function TodoItemActions(props: { todo: Todo }) {
  const todo = props.todo;
  return (
    <React.Fragment>
      <CloseTodoAction todo={todo} />
      <CloseAllTodoAction />
    </React.Fragment>
  );
}
