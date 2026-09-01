import { Alert, closeMainWindow, confirmAlert, LaunchProps, showToast, Toast } from "@raycast/api";
import { addTask } from "./service/osScript";
import { getProjects, initGlobalProjectInfo } from "./service/project";
import { getDefaultDate } from "./service/preference";
import { formatToServerDate } from "./utils/date";
import { parseQuickAdd } from "./utils/quickAddParser";

export default async function QuickAddTask(props: LaunchProps) {
  const closeAfterDelay = () => setTimeout(() => closeMainWindow(), 500);
  try {
    await initGlobalProjectInfo();
    const projects = getProjects();
    const parsed = parseQuickAdd(props.arguments.text ?? props.fallbackText, projects);
    if (!parsed.title) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task title required",
        message: "Add a title in addition to the date, list, or priority.",
      });
      closeAfterDelay();
      return;
    }

    const inbox = projects.find((project) => project.name === "Inbox");
    const projectId = parsed.projectId || inbox?.id || "";
    const projectName = projects.find((project) => project.id === projectId)?.name || "Inbox";
    const defaultDate = getDefaultDate();

    if (parsed.requiresConfirmation && parsed.dueDate) {
      const dueDate = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(parsed.isAllDay ? {} : { hour: "numeric", minute: "2-digit" }),
      }).format(parsed.dueDate);
      const priority =
        parsed.priority === "5"
          ? "High"
          : parsed.priority === "3"
          ? "Medium"
          : parsed.priority === "1"
          ? "Low"
          : "None";
      const confirmed = await confirmAlert({
        title: "Create This Task?",
        message: [`Title: ${parsed.title}`, `Due: ${dueDate}`, `List: ${projectName}`, `Priority: ${priority}`].join(
          "\n"
        ),
        primaryAction: { title: "Create Task" },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!confirmed) return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
    const title = parsed.title.replace(/"/g, `\\"`);
    const description = props.arguments.description?.replace(/"/g, `\\"`);
    const result = await addTask({
      projectId,
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
    await showToast({ style: Toast.Style.Failure, title: "Something went wrong" });
  }
  closeAfterDelay();
}
