import { LaunchProps, showToast, Toast } from "@raycast/api";
import { addTask } from "./lib/api/add-task";
import { checkOmniFocusInstalled } from "./lib/utils/ensure-installed";

export default async function AddTodoCommand(props: LaunchProps<{ arguments: Arguments.QuickAddToInbox }>) {
  const { todo } = props.arguments;
  const isInstalled = await checkOmniFocusInstalled();
  if (!isInstalled) {
    return;
  }
  await addTask({ name: todo, tags: [] });
  await showToast({
    title: "Task created!",
    style: Toast.Style.Success,
  });
}
