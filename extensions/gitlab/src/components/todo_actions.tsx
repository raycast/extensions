import { Action, ActionPanel, Color, Icon, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { jsonDataToIssue, jsonDataToMergeRequest as jsonDataToMergeRequest, Todo } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { IssueDetail } from "./issues";
import { MRDetail } from "./mr";
import { showFailureToast } from "@raycast/utils";

export function ShowTodoDetailsAction(props: { todo: Todo }): React.ReactNode | null {
  if (props.todo.target_type === "MergeRequest") {
    return (
      <Action.Push
        title="Show Details"
        target={<MRDetail mr={{ ...jsonDataToMergeRequest(props.todo.target), todo_id: props.todo.id }} />}
        icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
      />
    );
  } else if (props.todo.target_type === "Issue") {
    return (
      <Action.Push
        title="Show Details"
        target={<IssueDetail issue={jsonDataToIssue(props.todo.target)} />}
        icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
      />
    );
  } else {
    return null;
  }
}

export function CloseTodoAction(props: { todo: Todo; finished?: () => void }) {
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Marking Todo as done..." });
      await gitlab.post(`todos/${props.todo.id}/mark_as_done`);
      showToast(Toast.Style.Success, "Done", "Todo is now marked as done");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to mark Todo as done" });
    }
  }
  return (
    <ActionPanel.Item
      title="Mark as Done"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={handleAction}
    />
  );
}

export function CloseAllTodoAction(props: { finished?: () => void }) {
  async function handleAction() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Marking all Todos as done..." });
      await gitlab.post(`todos/mark_as_done`);
      showToast(Toast.Style.Success, "Done", "All Todos are now marked as done");
      props.finished?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Close All to do's" });
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
