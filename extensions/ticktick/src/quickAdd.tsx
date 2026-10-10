import { closeMainWindow, getPreferenceValues, LaunchProps, Toast } from "@raycast/api";
import { addTask, supportsNLP } from "./service/osScript";
import { getProjects, initGlobalProjectInfo } from "./service/project";
import { getDefaultDate } from "./service/preference";
import { formatToServerDate } from "./utils/date";

export default async function QuickAddTask(props: LaunchProps) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  await toast.show();
  try {
    const { nlpEnabled = true } = getPreferenceValues<Preferences.QuickAdd>();
    await initGlobalProjectInfo();
    const useNLP = nlpEnabled && (await supportsNLP().catch(() => false));
    const title = (props.arguments.text ?? props.fallbackText).replace(/"/g, `\\"`);
    const description = props.arguments.description?.replace(/"/g, `\\"`);
    const result = await addTask({
      projectId: getProjects().find((project) => project.name === "Inbox")?.id || "",
      title,
      description,
      dueDate: useNLP ? undefined : formatToServerDate(getDefaultDate()),
      isAllDay: false,
      nlp: useNLP,
    });

    switch (result) {
      case true: {
        if (nlpEnabled && !useNLP) {
          toast.style = Toast.Style.Failure;
          toast.title = "Task added without NLP";
          toast.message = "Upgrade TickTick to enable natural language recognition.";
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Add success";
        }
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
  await new Promise((resolve) => setTimeout(resolve, 500));
  await closeMainWindow();
}
