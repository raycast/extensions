import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast } from "@raycast/api";

import { quickAddTask, handleError, updateTask } from "./api";
import { isTodoistInstalled, checkTodoistApp } from "./helpers/isTodoistInstalled";
import { getTaskAppUrl, getTaskUrl } from "./helpers/tasks";
import { initializeApi } from "./helpers/withTodoistApi";

const command = async (props: { arguments: Arguments.QuickAddTask }) => {
  await initializeApi();
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  await toast.show();

  try {
    const preferences = getPreferenceValues<Preferences.QuickAddTask>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const { id } = await quickAddTask({
      text: props.arguments.text,
    });

    await updateTask({ id, description: props.arguments.description });

    toast.style = Toast.Style.Success;
    toast.title = "Task created";

    await checkTodoistApp();

    toast.primaryAction = {
      title: `Open Task ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: async () => {
        open(isTodoistInstalled ? getTaskAppUrl(id) : getTaskUrl(id));
      },
    };

    toast.secondaryAction = {
      title: "Copy Task URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(getTaskUrl(id)),
    };
  } catch (error) {
    handleError({ error, title: "Unable to create task" });
  }
};

export default command;
