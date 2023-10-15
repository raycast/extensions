import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast } from "@raycast/api";
import { isTodoistInstalled, checkTodoistApp } from "./helpers/isTodoistInstalled";
import { handleError, todoist } from "./api";

type Arguments = {
  title: string;
  description?: string;
  info?: string;
};

type Preferences = {
  shouldCloseMainWindow: boolean;
};

const command = async (props: { arguments: Arguments }) => {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  await toast.show();

  try {
    const preferences: Preferences = getPreferenceValues();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    const { url, id } = await todoist.quickAddTask({
      text: `${props.arguments.title}${props.arguments.info ? ` ${props.arguments.info}` : ""}`,
    });

    await todoist.updateTask(id, { description: props.arguments.description });

    toast.style = Toast.Style.Success;
    toast.title = "Task created";

    await checkTodoistApp();

    toast.primaryAction = {
      title: `Open Task ${isTodoistInstalled ? "in Todoist" : "in Browser"}`,
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: async () => {
        open(isTodoistInstalled ? `todoist://task?id=${id}` : url);
      },
    };

    toast.secondaryAction = {
      title: "Copy Task URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(url),
    };
  } catch (error) {
    handleError({ error, title: "Unable to create task" });
  }
};

export default command;
