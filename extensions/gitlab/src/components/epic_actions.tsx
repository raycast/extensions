import { ActionPanel, Color, KeyboardShortcut, showToast, ToastStyle } from "@raycast/api";
import { gitlab } from "../common";
import { Epic } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { getErrorMessage } from "../utils";

export function CreateEpicTodoAction(props: { epic: Epic; shortcut?: KeyboardShortcut }): JSX.Element | null {
  const epic = props.epic;
  async function handleAction() {
    try {
      await gitlab.post(`groups/${epic.group_id}/epics/${epic.iid}/todo`);
      showToast(ToastStyle.Success, "To do created");
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to add as to do", getErrorMessage(error));
    }
  }
  if (epic.state === "opened") {
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
