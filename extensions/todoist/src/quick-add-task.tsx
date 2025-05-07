import { Clipboard, closeMainWindow, popToRoot, getPreferenceValues, LaunchProps, open, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { quickAddTask } from "./api";
import { getTaskAppUrl, getTaskUrl } from "./helpers/tasks";
import { withTodoistApi } from "./helpers/withTodoistApi";
import { isTodoistInstalled } from "./hooks/useIsTodoistInstalled";

type QuickAddTaskProps = { arguments: Arguments.QuickAddTask } & LaunchProps;

async function QuickAddTask(props: QuickAddTaskProps) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  await toast.show();

  try {
    const preferences = getPreferenceValues<Preferences.QuickAddTask>();

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
      popToRoot({ clearSearchBar: true });
    }

    let text = props.arguments.text ?? props.fallbackText;
    if (props.arguments.description) {
      text = `${text} // ${props.arguments.description}`;
    }

    const { id } = await quickAddTask({ text });

    toast.style = Toast.Style.Success;
    toast.title = "Task created";

    const isInstalled = await isTodoistInstalled();

    toast.primaryAction = {
      title: `Open Task`,
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: async () => {
        open(isInstalled ? getTaskAppUrl(id) : getTaskUrl(id));
      },
    };

    toast.secondaryAction = {
      title: "Copy Task URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => Clipboard.copy(getTaskUrl(id)),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Unable to create task" });
  }
}

export default withTodoistApi(QuickAddTask);
