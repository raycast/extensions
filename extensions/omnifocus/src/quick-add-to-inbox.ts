import { LaunchProps, showToast, Toast } from "@raycast/api";
import { addTask } from "./lib/api/add-task";
import { checkOmniFocusInstalled, showNotInstalledErrorFeedback } from "./lib/utils/ensure-installed";
import { showNotProUserErrorFeedback, isProUser } from "./lib/utils/is-pro-user";

export default async function AddTodoCommand(props: LaunchProps<{ arguments: Arguments.QuickAddToInbox }>) {
  const { todo } = props.arguments;
  const isInstalled = await checkOmniFocusInstalled();
  if (!isInstalled) {
    await showNotInstalledErrorFeedback();
    return;
  }

  if (!(await isProUser())) {
    await showNotProUserErrorFeedback();
    return;
  }

  const { error } = await addTask({ name: todo, tags: [] });
  if (!error) {
    await showToast({
      title: "Task created!",
      style: Toast.Style.Success,
    });
  } else {
    await showToast({
      title: "An error occurred",
      style: Toast.Style.Failure,
    });
  }
}
