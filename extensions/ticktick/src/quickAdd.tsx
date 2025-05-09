import { closeMainWindow, getPreferenceValues, LaunchProps, Toast, environment, AI } from "@raycast/api";
import { addTask } from "./service/osScript";
import { getProjects, initGlobalProjectInfo } from "./service/project";
import { getDefaultDate } from "./service/preference";
import { formatToServerDate } from "./utils/date";
import { parseTaskWithAI } from "./utils/aiTaskParser";

interface Preferences {
  dontUseAI: boolean;
  shouldCloseMainWindow: boolean;
}

interface Arguments {
  text: string;
  description?: string;
}

export default async function QuickAddTask(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task..." });

  try {
    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
    }

    await toast.show();
    await initGlobalProjectInfo();

    const text = props.arguments.text.replace(/"/g, `\\"`);
    const description = props.arguments.description?.replace(/"/g, `\\"`);

    if (!preferences.dontUseAI && environment.canAccess(AI)) {
      // Use AI to parse task
      const parsedTask = await parseTaskWithAI(text);

      const result = await addTask({
        projectId: parsedTask.projectId || getProjects().find((project) => project.name === "Inbox")?.id || "",
        title: text,
        description: description || "",
        dueDate: parsedTask.dueDate,
        isAllDay: parsedTask.isAllDay,
        priority: parsedTask.priority,
      });

      handleResult(result, toast, text);
    } else {
      // Add task using default method
      const result = await addTask({
        projectId: getProjects().find((project) => project.name === "Inbox")?.id || "",
        title: text,
        description: description || "",
        dueDate: formatToServerDate(getDefaultDate()),
        isAllDay: false,
      });

      handleResult(result, toast, text);
    }
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add task";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

function handleResult(result: boolean | undefined, toast: Toast, taskTitle: string) {
  switch (result) {
    case true: {
      toast.style = Toast.Style.Success;
      toast.title = `Task "${taskTitle}" added successfully`;
      break;
    }
    case false: {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to add task "${taskTitle}"`;
      break;
    }
    default:
      break;
  }
}
