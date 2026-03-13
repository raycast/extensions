import { Action, ActionPanel, Color, Icon, showToast, Toast } from "@raycast/api";
import { gitlab } from "../common";
import { jsonDataToIssue, jsonDataToMergeRequest as jsonDataToMergeRequest, Todo } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage, showErrorToast } from "../utils";
import { IssueDetail } from "./issues";
import { MRDetail } from "./mr";

export function ShowTodoDetailsAction(props: { todo: Todo }): React.ReactNode | null {
  const todo = props.todo;
  const icon = { source: GitLabIcons.show_details, tintColor: Color.PrimaryText };
  if (todo.target_type === "MergeRequest") {
    const mr = jsonDataToMergeRequest(todo.target);
    return <Action.Push title="Show Details" target={<MRDetail mr={mr} />} icon={icon} />;
  } else if (todo.target_type === "Issue") {
    const issue = jsonDataToIssue(todo.target);
    return <Action.Push title="Show Details" target={<IssueDetail issue={issue} />} icon={icon} />;
  } else {
    return null;
  }
}

export function CloseTodoAction(props: { todo: Todo; finished?: () => void }) {
  const todo = props.todo;
  async function handleAction() {
    try {
      await gitlab.post(`todos/${todo.id}/mark_as_done`);
      showToast(Toast.Style.Success, "Done", "Todo is now marked as done");
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to mark Todo as done");
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
      await gitlab.post(`todos/mark_as_done`);
      showToast(Toast.Style.Success, "Done", "All Todos are now marked as done");
      if (props.finished) {
        props.finished();
      }
    } catch (error) {
      showErrorToast(getErrorMessage(error), "Failed to Close All to do's");
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
