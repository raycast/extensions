import { closeMainWindow, LaunchProps, Toast } from "@raycast/api";
import { addTask } from "./service/osScript";
import { getProjects, initGlobalProjectInfo } from "./service/project";
import { getDefaultDate } from "./service/preference";
import { formatToServerDate } from "./utils/date";
import { parseQuickAdd } from "./utils/quickAddParser";

export default async function QuickAddTask(props: LaunchProps) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  const closeAfterDelay = () => setTimeout(() => closeMainWindow(), 500);
  await toast.show();
  try {
    await initGlobalProjectInfo();
    const projects = getProjects();
    const parsed = parseQuickAdd(props.arguments.text ?? props.fallbackText, projects);
    if (!parsed.title) {
      toast.style = Toast.Style.Failure;
      toast.title = "Task title required";
      toast.message = "Add a title in addition to the date, list, or priority.";
      closeAfterDelay();
      return;
    }
    const title = parsed.title.replace(/"/g, `\\"`);
    const description = props.arguments.description?.replace(/"/g, `\\"`);
    const defaultDate = getDefaultDate();
    const result = await addTask({
      projectId: parsed.projectId || projects.find((project) => project.name === "Inbox")?.id || "",
      title,
      description,
      dueDate: formatToServerDate(parsed.dueDate || defaultDate),
      isAllDay: parsed.dueDate ? parsed.isAllDay : false,
      priority: parsed.priority,
    });

    switch (result) {
      case true: {
        toast.style = Toast.Style.Success;
        toast.title = "Add success";
        break;
      }
      case false: {
        toast.style = Toast.Style.Failure;
        toast.title = "Add failed";
        break;
      }
      default:
        break;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong";
  }
  closeAfterDelay();
}
