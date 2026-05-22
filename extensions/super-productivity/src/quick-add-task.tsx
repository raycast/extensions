import { LaunchProps, Toast, showToast } from "@raycast/api";
import { assertAppReady, createTask } from "./lib/sp-client";
import { getErrorMessage } from "./lib/sp-errors";

interface QuickAddArguments {
  title: string;
  notes?: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: QuickAddArguments }>,
) {
  try {
    await assertAppReady();
    await createTask({
      title: props.arguments.title,
      notes: props.arguments.notes,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Task created",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not create task",
      message: getErrorMessage(error),
    });
  }
}
