import { Clipboard, closeMainWindow, getPreferenceValues, open, Toast } from "@raycast/api";
import { isTodoistInstalled, checkTodoistApp } from "./helpers/isTodoistInstalled";
import { handleError, todoist } from "./api";

type Arguments = {
  title: string;
  description?: string;
  date?: string;
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

    const { url, id } = await todoist.addTask({
      content: props.arguments.title,
      description: props.arguments.description,
      dueString: props.arguments.date,
    });

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
