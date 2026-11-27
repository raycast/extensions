import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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

  try {
    await addTask({ name: todo, tags: [] });
    await showHUD("Task added to your OmniFocus inbox");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't add the task" });
  }
}
